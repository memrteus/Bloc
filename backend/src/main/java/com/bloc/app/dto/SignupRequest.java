package com.bloc.app.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public record SignupRequest(
        String email,
        String password,
        @JsonAlias({ "user_name" }) String username,
        @JsonAlias({ "full_name" }) String fullName) {
}
