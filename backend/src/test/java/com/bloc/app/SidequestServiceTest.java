package com.bloc.app;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.dto.DiscoverSidequestResponse;
import com.bloc.app.model.Sidequest;
import com.bloc.app.repository.SidequestRepository;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.service.SidequestService;

@ExtendWith(MockitoExtension.class)
class SidequestServiceTest {

    @Mock
    private SidequestRepository sidequestRepository;

    @InjectMocks
    private SidequestService sidequestService;

    @Test
    void discoverSidequestsTrimsFiltersAndMapsResponse() {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        Sidequest sidequest = sampleSidequest(creatorId);
        when(sidequestRepository.findDiscoverableSidequestsOrderByCreatedAtDesc("library", "study", null, null, 25.0, 20, 0))
                .thenReturn(List.of(sidequest));

        List<DiscoverSidequestResponse> response = sidequestService.discoverSidequests("  library  ", "  study  ", null, null, null, 20, 0);

        assertEquals(1, response.size());
        assertEquals("Library sprint", response.getFirst().title());
        assertEquals("study", response.getFirst().category());
        verify(sidequestRepository).findDiscoverableSidequestsOrderByCreatedAtDesc("library", "study", null, null, 25.0, 20, 0);
    }

    @Test
    void discoverSidequestsPassesClampedRadiusFilters() {
        when(sidequestRepository.findDiscoverableSidequestsOrderByCreatedAtDesc(null, null, 42.3868, -72.5301, 100.0, 20, 0))
                .thenReturn(List.of());

        List<DiscoverSidequestResponse> response = sidequestService.discoverSidequests(null, null, 42.3868, -72.5301, 250.0, 20, 0);

        assertEquals(0, response.size());
        verify(sidequestRepository).findDiscoverableSidequestsOrderByCreatedAtDesc(null, null, 42.3868, -72.5301, 100.0, 20, 0);
    }

    @Test
    void discoverSidequestsRejectsPartialLocation() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.discoverSidequests(null, null, 42.3868, null, null, 20, 0));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("lat and lng must be provided together.", exception.getReason());
    }

    @Test
    void discoverSidequestsAllowsZeroLimit() {
        when(sidequestRepository.findDiscoverableSidequestsOrderByCreatedAtDesc(null, null, null, null, 25.0, 0, 0))
                .thenReturn(List.of());

        List<DiscoverSidequestResponse> response = sidequestService.discoverSidequests(null, null, null, null, null, 0, 0);

        assertEquals(0, response.size());
        verify(sidequestRepository).findDiscoverableSidequestsOrderByCreatedAtDesc(null, null, null, null, 25.0, 0, 0);
    }

    @Test
    void discoverSidequestsRejectsNegativeLimit() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.discoverSidequests(null, null, null, null, null, -1, 0));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("limit must be at least 0.", exception.getReason());
    }

    @Test
    void discoverSidequestsRejectsNegativeOffset() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.discoverSidequests(null, null, null, null, null, 20, -1));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("offset must be at least 0.", exception.getReason());
    }

    @Test
    void createSidequestRejectsAuthenticatedUserWithoutProfile() {
        AuthenticatedUser user = new AuthenticatedUser(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "creator@bloc.test");
        CreateSidequestRequest request = new CreateSidequestRequest(
                "Library sprint",
                "Focus session before class",
                "study",
                "Main library",
                BigDecimal.valueOf(42.3910),
                BigDecimal.valueOf(-72.5266),
                8);
        when(sidequestRepository.profileExists(user.userId())).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.createSidequest(request, user));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Authenticated user does not have a matching profile row.", exception.getReason());
    }

    @Test
    void joinSidequestRejectsAuthenticatedUserWithoutProfile() {
        AuthenticatedUser user = new AuthenticatedUser(
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                "joiner@bloc.test");
        when(sidequestRepository.profileExists(user.userId())).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.joinSidequest("33333333-3333-3333-3333-333333333333", user));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Authenticated user does not have a matching profile row.", exception.getReason());
    }

    @Test
    void joinSidequestRejectsJoiningOwnSidequest() {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID sidequestId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        AuthenticatedUser user = new AuthenticatedUser(creatorId, "creator@bloc.test");
        when(sidequestRepository.profileExists(creatorId)).thenReturn(true);
        when(sidequestRepository.sidequestExists(sidequestId)).thenReturn(true);
        when(sidequestRepository.getRequiredSidequest(sidequestId)).thenReturn(sampleSidequest(creatorId));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.joinSidequest(sidequestId.toString(), user));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("You cannot join your own sidequest.", exception.getReason());
        verify(sidequestRepository).profileExists(creatorId);
        verify(sidequestRepository).sidequestExists(sidequestId);
        verify(sidequestRepository).getRequiredSidequest(sidequestId);
        verifyNoMoreInteractions(sidequestRepository);
    }

    @Test
    void joinSidequestRejectsDuplicateParticipant() {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID joinerId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID sidequestId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        AuthenticatedUser user = new AuthenticatedUser(joinerId, "joiner@bloc.test");
        when(sidequestRepository.profileExists(joinerId)).thenReturn(true);
        when(sidequestRepository.sidequestExists(sidequestId)).thenReturn(true);
        when(sidequestRepository.getRequiredSidequest(sidequestId)).thenReturn(sampleSidequestWithParticipants(
                creatorId,
                List.of(creatorId, joinerId)));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.joinSidequest(sidequestId.toString(), user));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals("You have already joined this sidequest.", exception.getReason());
        verify(sidequestRepository).profileExists(joinerId);
        verify(sidequestRepository).sidequestExists(sidequestId);
        verify(sidequestRepository).getRequiredSidequest(sidequestId);
        verifyNoMoreInteractions(sidequestRepository);
    }

    @Test
    void joinSidequestAddsParticipantForValidAuthenticatedUser() {
        UUID creatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID joinerId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID sidequestId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        AuthenticatedUser user = new AuthenticatedUser(joinerId, "joiner@bloc.test");
        Sidequest beforeJoin = sampleSidequestWithParticipants(creatorId, List.of(creatorId));
        Sidequest afterJoin = sampleSidequestWithParticipants(creatorId, List.of(creatorId, joinerId));

        when(sidequestRepository.profileExists(joinerId)).thenReturn(true);
        when(sidequestRepository.sidequestExists(sidequestId)).thenReturn(true);
        when(sidequestRepository.getRequiredSidequest(sidequestId)).thenReturn(beforeJoin, afterJoin);
        when(sidequestRepository.addParticipant(sidequestId, joinerId, "participant")).thenReturn(true);

        com.bloc.app.dto.SidequestResponse response = sidequestService.joinSidequest(sidequestId.toString(), user);

        assertEquals(sidequestId, response.id());
        assertEquals(List.of(creatorId, joinerId), response.participantUserIds());
        verify(sidequestRepository).addParticipant(sidequestId, joinerId, "participant");
    }

    private Sidequest sampleSidequest(UUID creatorId) {
        return sampleSidequestWithParticipants(creatorId, List.of(creatorId));
    }

    private Sidequest sampleSidequestWithParticipants(UUID creatorId, List<UUID> participantUserIds) {
        return new Sidequest(
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                creatorId,
                "Library sprint",
                "Focus session before class",
                "study",
                "Main library",
                BigDecimal.valueOf(42.3910),
                BigDecimal.valueOf(-72.5266),
                Instant.parse("2026-04-07T18:00:00Z"),
                Instant.parse("2026-04-08T18:00:00Z"),
                8,
                "active",
                null,
                Instant.parse("2026-04-07T17:00:00Z"),
                Instant.parse("2026-04-07T17:00:00Z"),
                participantUserIds,
                List.of("Creator"));
    }
}
