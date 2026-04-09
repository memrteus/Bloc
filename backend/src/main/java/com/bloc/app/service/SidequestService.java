package com.bloc.app.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.dto.SidequestResponse;
import com.bloc.app.repository.SidequestRepository;
import com.bloc.app.security.AuthenticatedUser;

@Service
public class SidequestService {

    private final SidequestRepository sidequestRepository;

    public SidequestService(SidequestRepository sidequestRepository) {
        this.sidequestRepository = sidequestRepository;
    }

    @Transactional(readOnly = true)
    public List<SidequestResponse> discoverSidequests() {
        return sidequestRepository.findAllSidequestsOrderByCreatedAtDesc().stream()
                .map(SidequestResponse::fromModel)
                .toList();
    }

    @Transactional
    public SidequestResponse createSidequest(CreateSidequestRequest request, AuthenticatedUser user) {
        ensureProfileExists(user);
        validateCreateRequest(request);

        Instant startsAt = Instant.now();
        Instant expiresAt = startsAt.plusSeconds(24 * 60 * 60);
        int maxParticipants = request.maxParticipants() != null ? request.maxParticipants() : 8;

        UUID sidequestId = sidequestRepository.insertSidequest(request, user.userId(), startsAt, expiresAt, maxParticipants);
        sidequestRepository.addParticipant(sidequestId, user.userId(), "creator");

        return SidequestResponse.fromModel(sidequestRepository.getRequiredSidequest(sidequestId));
    }

    @Transactional
    public SidequestResponse joinSidequest(String sidequestId, AuthenticatedUser user) {
        ensureProfileExists(user);

        UUID parsedSidequestId = parseUuid(sidequestId, "sidequestId");
        if (!sidequestRepository.sidequestExists(parsedSidequestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sidequest not found.");
        }

        if (!sidequestRepository.participantExists(parsedSidequestId, user.userId())) {
            sidequestRepository.addParticipant(parsedSidequestId, user.userId(), "participant");
        }

        return SidequestResponse.fromModel(sidequestRepository.getRequiredSidequest(parsedSidequestId));
    }

    private void ensureProfileExists(AuthenticatedUser user) {
        if (!sidequestRepository.profileExists(user.userId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Authenticated user does not have a matching profile row.");
        }
    }

    private void validateCreateRequest(CreateSidequestRequest request) {
        if (request.maxParticipants() != null && request.maxParticipants() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxParticipants must be at least 1.");
        }
    }

    private UUID parseUuid(String rawValue, String fieldName) {
        try {
            return UUID.fromString(rawValue);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be a valid UUID.", exception);
        }
    }
}
