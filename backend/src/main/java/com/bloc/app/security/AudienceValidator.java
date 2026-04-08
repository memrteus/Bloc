package com.bloc.app.security;

import java.util.List;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public class AudienceValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error INVALID_AUDIENCE = new OAuth2Error(
            "invalid_token",
            "The required token audience is missing.",
            null);

    private final String requiredAudience;

    public AudienceValidator(String requiredAudience) {
        this.requiredAudience = requiredAudience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        List<String> audience = token.getAudience();
        if (audience != null && audience.contains(requiredAudience)) {
            return OAuth2TokenValidatorResult.success();
        }

        return OAuth2TokenValidatorResult.failure(INVALID_AUDIENCE);
    }
}
