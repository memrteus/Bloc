package com.bloc.app.dto;

public record LoginRequest(
        String email,
        String password) {
}
