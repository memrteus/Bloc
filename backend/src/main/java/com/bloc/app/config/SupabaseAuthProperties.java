package com.bloc.app.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.util.StringUtils;

import com.bloc.app.security.AudienceValidator;

@ConfigurationProperties(prefix = "app.auth.supabase")
public class SupabaseAuthProperties {

    private String url;
    private String jwtSecret;
    private String jwkSetUri;
    private String issuer;
    private String audience = "authenticated";

    public JwtDecoder buildJwtDecoder() {
        if (StringUtils.hasText(jwtSecret)) {
            SecretKey secretKey = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            return NimbusJwtDecoder.withSecretKey(secretKey)
                    .macAlgorithm(MacAlgorithm.HS256)
                    .build();
        }

        String resolvedJwkSetUri = resolvedJwkSetUri();
        if (StringUtils.hasText(resolvedJwkSetUri)) {
            return NimbusJwtDecoder.withJwkSetUri(resolvedJwkSetUri).build();
        }

        throw new IllegalStateException(
                "Missing Supabase JWT configuration. Set app.auth.supabase.jwt-secret or app.auth.supabase.url/jwk-set-uri.");
    }

    public OAuth2TokenValidator<Jwt> buildTokenValidator() {
        OAuth2TokenValidator<Jwt> validator = StringUtils.hasText(resolvedIssuer())
                ? JwtValidators.createDefaultWithIssuer(resolvedIssuer())
                : JwtValidators.createDefault();

        if (StringUtils.hasText(audience)) {
            validator = new DelegatingOAuth2TokenValidator<>(validator, new AudienceValidator(audience));
        }

        return validator;
    }

    public String resolvedIssuer() {
        if (StringUtils.hasText(issuer)) {
            return issuer;
        }

        if (StringUtils.hasText(url)) {
            return trimTrailingSlash(url) + "/auth/v1";
        }

        return null;
    }

    public String resolvedJwkSetUri() {
        if (StringUtils.hasText(jwkSetUri)) {
            return jwkSetUri;
        }

        if (StringUtils.hasText(url)) {
            return trimTrailingSlash(url) + "/auth/v1/.well-known/jwks.json";
        }

        return null;
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public String getJwkSetUri() {
        return jwkSetUri;
    }

    public void setJwkSetUri(String jwkSetUri) {
        this.jwkSetUri = jwkSetUri;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getAudience() {
        return audience;
    }

    public void setAudience(String audience) {
        this.audience = audience;
    }
}
