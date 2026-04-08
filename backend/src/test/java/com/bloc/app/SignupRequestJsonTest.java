package com.bloc.app;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import com.bloc.app.dto.SignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;

class SignupRequestJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesCamelCaseFields() throws Exception {
        SignupRequest request = objectMapper.readValue(
                """
                {
                  "email": "student@umass.edu",
                  "password": "example-password",
                  "username": "blocuser",
                  "fullName": "Bloc User"
                }
                """,
                SignupRequest.class);

        assertEquals("student@umass.edu", request.email());
        assertEquals("blocuser", request.username());
        assertEquals("Bloc User", request.fullName());
    }

    @Test
    void deserializesSnakeCaseFields() throws Exception {
        SignupRequest request = objectMapper.readValue(
                """
                {
                  "email": "student@umass.edu",
                  "password": "example-password",
                  "user_name": "blocuser",
                  "full_name": "Bloc User"
                }
                """,
                SignupRequest.class);

        assertEquals("student@umass.edu", request.email());
        assertEquals("blocuser", request.username());
        assertEquals("Bloc User", request.fullName());
    }
}
