package com.bloc.app.security;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

public record AuthenticatedUser(UUID userId, String email) {

    public static AuthenticatedUser fromJwt(Jwt jwt) {
        String userId = jwt.getSubject();
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated token is missing the subject claim.");
        }

        try {
            return new AuthenticatedUser(UUID.fromString(userId), jwt.getClaimAsString("email"));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticated token subject must be a UUID.",
                    exception);
        }
    }
}
