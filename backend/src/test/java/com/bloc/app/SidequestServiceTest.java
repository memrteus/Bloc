package com.bloc.app;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
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

import com.bloc.app.dto.DiscoverSidequestResponse;
import com.bloc.app.model.Sidequest;
import com.bloc.app.repository.SidequestRepository;
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
        when(sidequestRepository.findDiscoverableSidequestsOrderByCreatedAtDesc("library", "study", 20, 0))
                .thenReturn(List.of(sidequest));

        List<DiscoverSidequestResponse> response = sidequestService.discoverSidequests("  library  ", "  study  ", 20, 0);

        assertEquals(1, response.size());
        assertEquals("Library sprint", response.getFirst().title());
        assertEquals("study", response.getFirst().category());
        verify(sidequestRepository).findDiscoverableSidequestsOrderByCreatedAtDesc("library", "study", 20, 0);
    }

    @Test
    void discoverSidequestsAllowsZeroLimit() {
        when(sidequestRepository.findDiscoverableSidequestsOrderByCreatedAtDesc(null, null, 0, 0))
                .thenReturn(List.of());

        List<DiscoverSidequestResponse> response = sidequestService.discoverSidequests(null, null, 0, 0);

        assertEquals(0, response.size());
        verify(sidequestRepository).findDiscoverableSidequestsOrderByCreatedAtDesc(null, null, 0, 0);
    }

    @Test
    void discoverSidequestsRejectsNegativeLimit() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.discoverSidequests(null, null, -1, 0));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("limit must be at least 0.", exception.getReason());
    }

    @Test
    void discoverSidequestsRejectsNegativeOffset() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> sidequestService.discoverSidequests(null, null, 20, -1));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("offset must be at least 0.", exception.getReason());
    }

    private Sidequest sampleSidequest(UUID creatorId) {
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
                Instant.parse("2026-04-07T17:00:00Z"),
                Instant.parse("2026-04-07T17:00:00Z"),
                List.of(creatorId));
    }
}
