package com.bloc.app.dto;

public record SignupResponse(
        String message,
        String userId,
        String email) {
}
