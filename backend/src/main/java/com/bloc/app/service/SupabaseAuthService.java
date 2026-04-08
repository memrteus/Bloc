package com.bloc.app.service;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.config.SupabaseAuthProperties;
import com.bloc.app.dto.CurrentUserResponse;
import com.bloc.app.dto.LoginRequest;
import com.bloc.app.dto.LoginResponse;
import com.bloc.app.dto.SignupRequest;
import com.bloc.app.dto.SignupResponse;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.repository.ProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SupabaseAuthService implements AuthService {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseAuthService.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    private final ObjectMapper objectMapper;
    private final SupabaseAuthProperties supabaseAuthProperties;
    private final ProfileRepository profileRepository;

    public SupabaseAuthService(
            ObjectMapper objectMapper,
            SupabaseAuthProperties supabaseAuthProperties,
            ProfileRepository profileRepository) {
        this.objectMapper = objectMapper;
        this.supabaseAuthProperties = supabaseAuthProperties;
        this.profileRepository = profileRepository;
    }

    @Override
    public SignupResponse signup(SignupRequest request) {
        validateSignupRequest(request);

        String signupUrl = buildAuthUrl("/auth/v1/signup");
        String publishableKey = requirePublishableKey();

        try {
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(signupUrl))
                    .header("apikey", publishableKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(buildSignupPayload(request))))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode responseBody = parseJson(response.body());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(resolveErrorStatus(response.statusCode()), extractErrorMessage(responseBody));
            }

            JsonNode userNode = responseBody.path("user");
            String userId = userNode.path("id").asText(null);
            String email = firstNonBlank(userNode.path("email").asText(null), request.email());
            boolean emailConfirmationRequired = responseBody.path("session").isMissingNode()
                    || responseBody.path("session").isNull();
            boolean profileCreated = bootstrapProfileIfPossible(userId, email, request);

            String message = userNode.isMissingNode() || userNode.isNull()
                    ? "Signup request accepted. If the account can be created, check your email for the next step."
                    : emailConfirmationRequired
                    ? "Signup succeeded. Check your email to confirm your account."
                    : "Signup succeeded.";

            return new SignupResponse(message, userId, email, emailConfirmationRequired, profileCreated);
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Failed to reach Supabase signup service.",
                    exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Supabase signup request was interrupted.",
                    exception);
        }
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        validateLoginRequest(request);

        String loginUrl = buildAuthUrl("/auth/v1/token?grant_type=password");
        String publishableKey = requirePublishableKey();

        try {
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(loginUrl))
                    .header("apikey", publishableKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(Map.of(
                            "email", request.email(),
                            "password", request.password()))))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode responseBody = parseJson(response.body());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(resolveErrorStatus(response.statusCode()), extractErrorMessage(responseBody));
            }

            JsonNode userNode = responseBody.path("user");
            return new LoginResponse(
                    responseBody.path("access_token").asText(null),
                    responseBody.path("refresh_token").asText(null),
                    responseBody.path("token_type").asText(null),
                    responseBody.path("expires_in").isNumber() ? responseBody.path("expires_in").asLong() : null,
                    userNode.path("id").asText(null),
                    userNode.path("email").asText(null));
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Failed to reach Supabase login service.",
                    exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Supabase login request was interrupted.",
                    exception);
        }
    }

    @Override
    public CurrentUserResponse getCurrentUser(AuthenticatedUser authenticatedUser) {
        return profileRepository.findCurrentUserProfile(authenticatedUser.userId())
                .map(profile -> new CurrentUserResponse(
                        authenticatedUser.userId().toString(),
                        firstNonBlank(authenticatedUser.email(), profile.umassEmail()),
                        profile.username(),
                        profile.fullName(),
                        profile.umassEmail(),
                        profile.avatarUrl(),
                        profile.bio()))
                .orElseGet(() -> new CurrentUserResponse(
                        authenticatedUser.userId().toString(),
                        authenticatedUser.email(),
                        null,
                        null,
                        null,
                        null,
                        null));
    }

    private void validateSignupRequest(SignupRequest request) {
        if (!StringUtils.hasText(request.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        if (!StringUtils.hasText(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }
    }

    private void validateLoginRequest(LoginRequest request) {
        if (!StringUtils.hasText(request.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        if (!StringUtils.hasText(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }
    }

    private String buildAuthUrl(String path) {
        if (!StringUtils.hasText(supabaseAuthProperties.getUrl())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "SUPABASE_URL is not configured.");
        }

        String baseUrl = trimTrailingSlash(supabaseAuthProperties.getUrl());
        URI baseUri = parseSupabaseBaseUri(baseUrl);

        return baseUri.resolve(path).toString();
    }

    private String requirePublishableKey() {
        if (!StringUtils.hasText(supabaseAuthProperties.getPublishableKey())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "SUPABASE_PUBLISHABLE_KEY is not configured.");
        }

        return supabaseAuthProperties.getPublishableKey();
    }

    private Map<String, Object> buildSignupPayload(SignupRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", request.email());
        payload.put("password", request.password());

        Map<String, Object> metadata = new LinkedHashMap<>();
        if (StringUtils.hasText(request.username())) {
            metadata.put("username", request.username());
        }
        if (StringUtils.hasText(request.fullName())) {
            metadata.put("full_name", request.fullName());
        }
        metadata.put("umass_email", request.email());

        if (!metadata.isEmpty()) {
            payload.put("options", Map.of("data", metadata));
        }

        return payload;
    }

    private JsonNode parseJson(String body) throws IOException {
        if (!StringUtils.hasText(body)) {
            return objectMapper.createObjectNode();
        }

        return objectMapper.readTree(body);
    }

    private HttpStatus resolveErrorStatus(int statusCode) {
        if (statusCode >= 400 && statusCode < 500) {
            return HttpStatus.valueOf(statusCode);
        }

        return HttpStatus.BAD_GATEWAY;
    }

    private String extractErrorMessage(JsonNode responseBody) {
        String message = firstNonBlank(
                responseBody.path("msg").asText(null),
                responseBody.path("message").asText(null),
                responseBody.path("error_description").asText(null),
                responseBody.path("error").asText(null));

        return StringUtils.hasText(message) ? message : "Supabase request failed.";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }

        return null;
    }

    private URI parseSupabaseBaseUri(String baseUrl) {
        try {
            URI baseUri = new URI(baseUrl);
            String scheme = baseUri.getScheme();
            if (!StringUtils.hasText(scheme) || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw invalidSupabaseUrl();
            }

            if (!StringUtils.hasText(baseUri.getHost())) {
                throw invalidSupabaseUrl();
            }

            return baseUri;
        } catch (URISyntaxException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "SUPABASE_URL is invalid. Use an absolute URL such as https://<project-ref>.supabase.co.",
                    exception);
        }
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private ResponseStatusException invalidSupabaseUrl() {
        return new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "SUPABASE_URL must be an absolute http(s) URL such as https://<project-ref>.supabase.co.");
    }

    private boolean bootstrapProfileIfPossible(String userId, String email, SignupRequest request) {
        if (!StringUtils.hasText(userId)) {
            return false;
        }

        try {
            return profileRepository.bootstrapProfile(
                    UUID.fromString(userId),
                    email,
                    request.username(),
                    request.fullName());
        } catch (IllegalArgumentException | DataAccessException exception) {
            logger.warn("Signup succeeded but profile bootstrap could not be completed for user {}", userId, exception);
            return false;
        }
    }

    private ResponseStatusException notImplemented(String message) {
        return new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, message);
    }
}
