package com.bloc.app;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.bloc.app.controller.AuthController;
import com.bloc.app.dto.CurrentUserResponse;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.security.SecurityConfig;
import com.bloc.app.service.AuthService;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.supabase.jwt-secret=test-secret-for-security-tests")
class AuthControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void meRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(authService);
    }

    @Test
    void logoutRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(authService);
    }

    @Test
    void logoutForwardsAccessToken() throws Exception {
        String tokenValue = "token-123";

        mockMvc.perform(post("/api/auth/logout")
                        .with(jwt().jwt(jwt -> jwt
                                .tokenValue(tokenValue)
                                .subject("44444444-4444-4444-4444-444444444444")
                                .claim("email", "student4@umass.edu"))))
                .andExpect(status().isNoContent());

        verify(authService).logout(tokenValue);
    }

    @Test
    void meUsesAuthenticatedUserContext() throws Exception {
        UUID userId = UUID.fromString("44444444-4444-4444-4444-444444444444");
        when(authService.getCurrentUser(org.mockito.ArgumentMatchers.any())).thenReturn(new CurrentUserResponse(
                userId.toString(),
                "student4@umass.edu",
                "blocuser",
                "Bloc User",
                "student4@umass.edu",
                null,
                "Ready for the next sidequest"));

        mockMvc.perform(get("/api/auth/me")
                        .with(jwt().jwt(jwt -> jwt
                                .subject(userId.toString())
                                .claim("email", "student4@umass.edu"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.email").value("student4@umass.edu"))
                .andExpect(jsonPath("$.username").value("blocuser"))
                .andExpect(jsonPath("$.bio").value("Ready for the next sidequest"));

        ArgumentCaptor<AuthenticatedUser> userCaptor = ArgumentCaptor.forClass(AuthenticatedUser.class);
        verify(authService).getCurrentUser(userCaptor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(userId, userCaptor.getValue().userId());
        org.junit.jupiter.api.Assertions.assertEquals("student4@umass.edu", userCaptor.getValue().email());
    }
}
