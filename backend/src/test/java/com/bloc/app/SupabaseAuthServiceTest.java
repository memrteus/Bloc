package com.bloc.app;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.bloc.app.config.SupabaseAuthProperties;
import com.bloc.app.dto.LoginRequest;
import com.bloc.app.dto.LoginResponse;
import com.bloc.app.dto.SignupRequest;
import com.bloc.app.dto.SignupResponse;
import com.bloc.app.repository.ProfileRepository;
import com.bloc.app.service.SupabaseAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

class SupabaseAuthServiceTest {

    private HttpServer httpServer;
    private final AtomicReference<String> capturedApiKey = new AtomicReference<>();
    private final AtomicReference<String> capturedBody = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress(0), 0);
    }

    @AfterEach
    void tearDown() {
        if (httpServer != null) {
            httpServer.stop(0);
        }
    }

    @Test
    void signupCallsSupabaseAndBootstrapsProfile() {
        httpServer.createContext("/auth/v1/signup", exchange -> {
            capturedApiKey.set(exchange.getRequestHeaders().getFirst("apikey"));
            capturedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));

            byte[] responseBody = """
                    {
                      "user": {
                        "id": "11111111-1111-1111-1111-111111111111",
                        "email": "student@umass.edu"
                      },
                      "session": null
                    }
                    """.getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBody.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(responseBody);
            }
        });
        httpServer.start();

        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        when(profileRepository.bootstrapProfile(
                java.util.UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "student@umass.edu",
                "blocuser",
                "Bloc User")).thenReturn(true);

        SupabaseAuthProperties properties = new SupabaseAuthProperties();
        properties.setUrl("http://localhost:" + httpServer.getAddress().getPort());
        properties.setPublishableKey("test-publishable-key");

        SupabaseAuthService authService = new SupabaseAuthService(new ObjectMapper(), properties, profileRepository);

        SignupResponse response = authService.signup(new SignupRequest(
                "student@umass.edu",
                "example-password",
                "blocuser",
                "Bloc User"));

        assertEquals("11111111-1111-1111-1111-111111111111", response.userId());
        assertEquals("student@umass.edu", response.email());
        assertTrue(response.emailConfirmationRequired());
        assertTrue(response.profileCreated());
        assertEquals("test-publishable-key", capturedApiKey.get());
        assertTrue(capturedBody.get().contains("\"email\":\"student@umass.edu\""));
        assertTrue(capturedBody.get().contains("\"password\":\"example-password\""));
        assertTrue(capturedBody.get().contains("\"username\":\"blocuser\""));
        verify(profileRepository).bootstrapProfile(
                java.util.UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "student@umass.edu",
                "blocuser",
                "Bloc User");
    }

    @Test
    void signupReturnsFalseWhenProfileBootstrapCannotBeCompleted() {
        httpServer.createContext("/auth/v1/signup", exchange -> {
            byte[] responseBody = """
                    {
                      "user": {
                        "id": "22222222-2222-2222-2222-222222222222",
                        "email": "student2@umass.edu"
                      },
                      "session": {
                        "access_token": "token"
                      }
                    }
                    """.getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBody.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(responseBody);
            }
        });
        httpServer.start();

        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        when(profileRepository.bootstrapProfile(
                java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"),
                "student2@umass.edu",
                null,
                null)).thenThrow(new org.springframework.dao.DataIntegrityViolationException("fk"));

        SupabaseAuthProperties properties = new SupabaseAuthProperties();
        properties.setUrl("http://localhost:" + httpServer.getAddress().getPort());
        properties.setPublishableKey("test-publishable-key");

        SupabaseAuthService authService = new SupabaseAuthService(new ObjectMapper(), properties, profileRepository);

        SignupResponse response = authService.signup(new SignupRequest(
                "student2@umass.edu",
                "example-password",
                null,
                null));

        assertFalse(response.emailConfirmationRequired());
        assertFalse(response.profileCreated());
    }

    @Test
    void loginCallsSupabasePasswordGrantAndReturnsSessionTokens() {
        httpServer.createContext("/auth/v1/token", exchange -> {
            capturedApiKey.set(exchange.getRequestHeaders().getFirst("apikey"));
            capturedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            assertEquals("grant_type=password", exchange.getRequestURI().getQuery());

            byte[] responseBody = """
                    {
                      "access_token": "access-token-value",
                      "refresh_token": "refresh-token-value",
                      "token_type": "bearer",
                      "expires_in": 3600,
                      "user": {
                        "id": "33333333-3333-3333-3333-333333333333",
                        "email": "student3@umass.edu"
                      }
                    }
                    """.getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBody.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(responseBody);
            }
        });
        httpServer.start();

        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        SupabaseAuthProperties properties = new SupabaseAuthProperties();
        properties.setUrl("http://localhost:" + httpServer.getAddress().getPort());
        properties.setPublishableKey("test-publishable-key");

        SupabaseAuthService authService = new SupabaseAuthService(new ObjectMapper(), properties, profileRepository);

        LoginResponse response = authService.login(new LoginRequest(
                "student3@umass.edu",
                "example-password"));

        assertEquals("access-token-value", response.accessToken());
        assertEquals("refresh-token-value", response.refreshToken());
        assertEquals("bearer", response.tokenType());
        assertEquals(3600L, response.expiresIn());
        assertEquals("33333333-3333-3333-3333-333333333333", response.userId());
        assertEquals("student3@umass.edu", response.email());
        assertEquals("test-publishable-key", capturedApiKey.get());
        assertTrue(capturedBody.get().contains("\"email\":\"student3@umass.edu\""));
        assertTrue(capturedBody.get().contains("\"password\":\"example-password\""));
    }

    @Test
    void loginHandlesSuccessfulResponseWithoutUserObject() {
        httpServer.createContext("/auth/v1/token", exchange -> {
            byte[] responseBody = """
                    {
                      "access_token": "access-token-value",
                      "refresh_token": "refresh-token-value",
                      "token_type": "bearer",
                      "expires_in": 3600
                    }
                    """.getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBody.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(responseBody);
            }
        });
        httpServer.start();

        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        SupabaseAuthProperties properties = new SupabaseAuthProperties();
        properties.setUrl("http://localhost:" + httpServer.getAddress().getPort());
        properties.setPublishableKey("test-publishable-key");

        SupabaseAuthService authService = new SupabaseAuthService(new ObjectMapper(), properties, profileRepository);

        LoginResponse response = authService.login(new LoginRequest(
                "student4@umass.edu",
                "example-password"));

        assertEquals("access-token-value", response.accessToken());
        assertNull(response.userId());
        assertNull(response.email());
    }
}
