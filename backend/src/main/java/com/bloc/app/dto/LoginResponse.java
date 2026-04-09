package com.bloc.app.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Long expiresIn,
        String userId,
        String email) {
}
