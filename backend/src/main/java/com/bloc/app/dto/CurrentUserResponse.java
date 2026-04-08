package com.bloc.app.dto;

public record CurrentUserResponse(
        String userId,
        String email,
        String username,
        String fullName,
        String umassEmail,
        String avatarUrl,
        String bio) {
}
