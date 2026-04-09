package com.bloc.app;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

import com.bloc.app.controller.ProfileController;
import com.bloc.app.dto.ProfileResponse;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.security.SecurityConfig;
import com.bloc.app.service.ProfileService;

@WebMvcTest(ProfileController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.supabase.jwt-secret=test-secret-for-security-tests")
class ProfileControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProfileService profileService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void meRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(get("/api/profiles/me"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(profileService);
    }

    @Test
    void meUsesAuthenticatedUserContext() throws Exception {
        UUID userId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        when(profileService.getCurrentProfile(any())).thenReturn(new ProfileResponse(
                userId.toString(),
                "blocuser",
                "Bloc User",
                "bloc@umass.edu",
                null,
                "Looking for teammates"));

        mockMvc.perform(get("/api/profiles/me")
                        .with(jwt().jwt(jwt -> jwt
                                .subject(userId.toString())
                                .claim("email", "bloc@umass.edu"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("blocuser"))
                .andExpect(jsonPath("$.bio").value("Looking for teammates"));

        ArgumentCaptor<AuthenticatedUser> userCaptor = ArgumentCaptor.forClass(AuthenticatedUser.class);
        verify(profileService).getCurrentProfile(userCaptor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(userId, userCaptor.getValue().userId());
        org.junit.jupiter.api.Assertions.assertEquals("bloc@umass.edu", userCaptor.getValue().email());
    }

    @Test
    void getProfileByIdReturnsPublicProfileDto() throws Exception {
        UUID userId = UUID.fromString("66666666-6666-6666-6666-666666666666");
        when(profileService.getProfileById(userId.toString())).thenReturn(new ProfileResponse(
                userId.toString(),
                "publicbloc",
                "Public Bloc",
                "public@umass.edu",
                "https://example.com/avatar.png",
                "Open to study groups"));

        mockMvc.perform(get("/api/profiles/{id}", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("publicbloc"))
                .andExpect(jsonPath("$.avatarUrl").value("https://example.com/avatar.png"));

        verify(profileService).getProfileById(userId.toString());
    }
}
