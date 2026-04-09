package com.bloc.app.dto;

public record SignupResponse(
        String message,
        String userId,
        String email,
        boolean emailConfirmationRequired,
        boolean profileCreated) {
}
