package com.bloc.app.dto;

public record SignupRequest(
        String email,
        String password,
        String username,
        String fullName) {
}
