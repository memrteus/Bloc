package com.bloc.app.dto;

public record ProfileResponse(
        String id,
        String username,
        String fullName,
        String umassEmail,
        String avatarUrl,
        String bio) {
}
