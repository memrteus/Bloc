package com.bloc.app;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.controller.SidequestController;
import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.dto.DiscoverSidequestResponse;
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
    void joinSidequestRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(post("/api/sidequests/{sidequestId}/join", "33333333-3333-3333-3333-333333333333"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(sidequestService);
    }

    @Test
    void joinSidequestRejectsInvalidBearerToken() throws Exception {
        mockMvc.perform(post("/api/sidequests/{sidequestId}/join", "33333333-3333-3333-3333-333333333333")
                        .header(AUTHORIZATION, "Bearer not-a-real-token"))
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
    void discoverSidequestsReturnsBasicDtoListSortedByRepositoryOrder() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID secondCreatorId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        when(sidequestService.discoverSidequests(null, null, null, null, null, 20, 0)).thenReturn(List.of(
                sampleDiscoverResponse(creatorId),
                sampleDiscoverResponse(secondCreatorId)));

        mockMvc.perform(get("/api/sidequests/discover"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].creatorId").value(creatorId.toString()))
                .andExpect(jsonPath("$[1].creatorId").value(secondCreatorId.toString()))
                .andExpect(jsonPath("$[0].participantUserIds").doesNotExist());

        verify(sidequestService).discoverSidequests(null, null, null, null, null, 20, 0);
    }

    @Test
    void discoverSidequestsPassesSearchQueryParam() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(sidequestService.discoverSidequests("library", null, null, null, null, 20, 0)).thenReturn(List.of(
                sampleDiscoverResponse(creatorId)));

        mockMvc.perform(get("/api/sidequests/discover").param("search", "library"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].locationName").value("Main library"));

        verify(sidequestService).discoverSidequests("library", null, null, null, null, 20, 0);
    }

    @Test
    void discoverSidequestsPassesCategoryQueryParam() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(sidequestService.discoverSidequests(null, "study", null, null, null, 20, 0)).thenReturn(List.of(
                sampleDiscoverResponse(creatorId)));

        mockMvc.perform(get("/api/sidequests/discover").param("category", "study"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].category").value("study"));

        verify(sidequestService).discoverSidequests(null, "study", null, null, null, 20, 0);
    }

    @Test
    void discoverSidequestsPassesPaginationQueryParams() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(sidequestService.discoverSidequests(null, null, null, null, null, 5, 10)).thenReturn(List.of(
                sampleDiscoverResponse(creatorId)));

        mockMvc.perform(get("/api/sidequests/discover")
                        .param("limit", "5")
                        .param("offset", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].creatorId").value(creatorId.toString()));

        verify(sidequestService).discoverSidequests(null, null, null, null, null, 5, 10);
    }

    @Test
    void discoverSidequestsPassesLocationRadiusQueryParams() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(sidequestService.discoverSidequests(null, null, 42.3868, -72.5301, 25.0, 20, 0)).thenReturn(List.of(
                sampleDiscoverResponse(creatorId)));

        mockMvc.perform(get("/api/sidequests/discover")
                        .param("lat", "42.3868")
                        .param("lng", "-72.5301")
                        .param("radiusMiles", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].creatorId").value(creatorId.toString()));

        verify(sidequestService).discoverSidequests(null, null, 42.3868, -72.5301, 25.0, 20, 0);
    }

    @Test
    void discoverSidequestsRejectsNegativeLimit() throws Exception {
        when(sidequestService.discoverSidequests(null, null, null, null, null, -1, 0))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "limit must be at least 0."));

        mockMvc.perform(get("/api/sidequests/discover").param("limit", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void discoverSidequestsRejectsNegativeOffset() throws Exception {
        when(sidequestService.discoverSidequests(null, null, null, null, null, 20, -1))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "offset must be at least 0."));

        mockMvc.perform(get("/api/sidequests/discover").param("offset", "-1"))
                .andExpect(status().isBadRequest());
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

    @Test
    void joinSidequestRejectsJoiningOwnSidequest() throws Exception {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID sidequestId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        when(sidequestService.joinSidequest(any(), any()))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "You cannot join your own sidequest."));

        mockMvc.perform(post("/api/sidequests/{sidequestId}/join", sidequestId)
                        .with(jwt().jwt(jwt -> jwt
                                .subject(creatorId.toString())
                                .claim("email", "creator@bloc.test"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void joinSidequestRejectsDuplicateParticipant() throws Exception {
        UUID joinerId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID sidequestId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        when(sidequestService.joinSidequest(any(), any()))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "You have already joined this sidequest."));

        mockMvc.perform(post("/api/sidequests/{sidequestId}/join", sidequestId)
                        .with(jwt().jwt(jwt -> jwt
                                .subject(joinerId.toString())
                                .claim("email", "joiner@bloc.test"))))
                .andExpect(status().isConflict());
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
                null,
                creatorId,
                participantUserIds,
                List.of("Creator"),
                Instant.parse("2026-04-07T17:00:00Z"),
                Instant.parse("2026-04-07T17:00:00Z"));
    }

    private DiscoverSidequestResponse sampleDiscoverResponse(UUID creatorId) {
        return new DiscoverSidequestResponse(
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
                null,
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
