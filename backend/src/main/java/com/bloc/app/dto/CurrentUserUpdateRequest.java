package com.bloc.app.dto;

public record CurrentUserUpdateRequest(
        String avatarUrl,
        String bio) {
}
