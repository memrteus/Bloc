package com.bloc.app;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.bloc.app.controller.SidequestController;
import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.dto.SidequestResponse;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.security.SecurityConfig;
import com.bloc.app.service.SidequestService;

@WebMvcTest(SidequestController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "app.auth.supabase.jwt-secret=test-secret-for-security-tests")
class SidequestSecurityWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SidequestService sidequestService;

    @Test
    void createSidequestRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(post("/api/sidequests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sidequestPayload()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(sidequestService);
    }

    @Test
    void createSidequestRejectsInvalidBearerToken() throws Exception {
        mockMvc.perform(post("/api/sidequests")
                        .header(AUTHORIZATION, "Bearer not-a-real-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sidequestPayload()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(sidequestService);
    }

    @Test
    void createSidequestUsesAuthenticatedUserContext() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(sidequestService.createSidequest(any(), any())).thenReturn(sampleResponse(creatorId, List.of(creatorId)));

        mockMvc.perform(post("/api/sidequests")
                        .with(jwt().jwt(jwt -> jwt
                                .subject(creatorId.toString())
                                .claim("email", "creator@bloc.test")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sidequestPayload()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.creatorId").value(creatorId.toString()))
                .andExpect(jsonPath("$.participantUserIds[0]").value(creatorId.toString()));

        ArgumentCaptor<CreateSidequestRequest> requestCaptor = ArgumentCaptor.forClass(CreateSidequestRequest.class);
        ArgumentCaptor<AuthenticatedUser> userCaptor = ArgumentCaptor.forClass(AuthenticatedUser.class);
        verify(sidequestService).createSidequest(requestCaptor.capture(), userCaptor.capture());

        CreateSidequestRequest request = requestCaptor.getValue();
        AuthenticatedUser user = userCaptor.getValue();

        org.junit.jupiter.api.Assertions.assertEquals("Library sprint", request.title());
        org.junit.jupiter.api.Assertions.assertEquals("Main library", request.locationName());
        org.junit.jupiter.api.Assertions.assertEquals(creatorId, user.userId());
    }

    @Test
    void joinSidequestUsesAuthenticatedUserContext() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID joinerId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID sidequestId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        when(sidequestService.joinSidequest(any(), any())).thenReturn(sampleResponse(creatorId, List.of(creatorId, joinerId)));

        mockMvc.perform(post("/api/sidequests/{sidequestId}/join", sidequestId)
                        .with(jwt().jwt(jwt -> jwt
                                .subject(joinerId.toString())
                                .claim("email", "joiner@bloc.test"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantUserIds[1]").value(joinerId.toString()));

        ArgumentCaptor<AuthenticatedUser> userCaptor = ArgumentCaptor.forClass(AuthenticatedUser.class);
        verify(sidequestService).joinSidequest(org.mockito.ArgumentMatchers.eq(sidequestId.toString()), userCaptor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(joinerId, userCaptor.getValue().userId());
    }

    private SidequestResponse sampleResponse(UUID creatorId, List<UUID> participantUserIds) {
        return new SidequestResponse(
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                "Library sprint",
                "Focus session before class",
                "study",
                "Main library",
                null,
                null,
                Instant.parse("2026-04-07T18:00:00Z"),
                Instant.parse("2026-04-08T18:00:00Z"),
                8,
                "active",
                creatorId,
                participantUserIds,
                Instant.parse("2026-04-07T17:00:00Z"),
                Instant.parse("2026-04-07T17:00:00Z"));
    }

    private String sidequestPayload() {
        return """
                {
                  "title": "Library sprint",
                  "description": "Focus session before class",
                  "category": "study",
                  "locationName": "Main library",
                  "latitude": 42.3910,
                  "longitude": -72.5266,
                  "maxParticipants": 8
                }
                """;
    }
}
