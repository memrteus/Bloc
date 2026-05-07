package com.bloc.app.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.dto.DiscoverSidequestResponse;
import com.bloc.app.dto.SidequestDetailResponse;
import com.bloc.app.dto.SidequestResponse;
import com.bloc.app.dto.UpdateSidequestRequest;
import com.bloc.app.model.Sidequest;
import com.bloc.app.repository.SidequestRepository;
import com.bloc.app.repository.SidequestRepository.SidequestParticipantSummary;
import com.bloc.app.repository.SidequestRepository.SidequestUserSummary;
import com.bloc.app.security.AuthenticatedUser;

@Service
public class SidequestService {

    private static final double DEFAULT_RADIUS_MILES = 25.0;
    private static final double MIN_RADIUS_MILES = 1.0;
    private static final double MAX_RADIUS_MILES = 100.0;
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_DELETED = "deleted";

    private final SidequestRepository sidequestRepository;

    public SidequestService(SidequestRepository sidequestRepository) {
        this.sidequestRepository = sidequestRepository;
    }

    @Transactional(readOnly = true)
    public List<DiscoverSidequestResponse> discoverSidequests(
            String search,
            String category,
            Double latitude,
            Double longitude,
            Double radiusMiles,
            int limit,
            int offset) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        String normalizedCategory = category != null && !category.isBlank() ? category.trim() : null;
        validateDiscoveryPagination(limit, offset);
        validateLocationQuery(latitude, longitude);
        double clampedRadiusMiles = clampRadiusMiles(radiusMiles);

        return sidequestRepository.findDiscoverableSidequestsOrderByCreatedAtDesc(
                        normalizedSearch,
                        normalizedCategory,
                        latitude,
                        longitude,
                        clampedRadiusMiles,
                        limit,
                        offset)
                .stream()
                .map(DiscoverSidequestResponse::fromModel)
                .toList();
    }

    @Transactional(readOnly = true)
    public SidequestDetailResponse getSidequest(String sidequestId, AuthenticatedUser user) {
        UUID parsedSidequestId = parseUuid(sidequestId, "sidequestId");
        if (!sidequestRepository.sidequestExists(parsedSidequestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sidequest not found.");
        }

        return buildDetailResponse(parsedSidequestId, user);
    }

    @Transactional(readOnly = true)
    public List<DiscoverSidequestResponse> getMyJoinedSidequests(AuthenticatedUser user) {
        return sidequestRepository.findJoinedSidequestsOrderByJoinedAtDesc(user.userId())
                .stream()
                .map(DiscoverSidequestResponse::fromModel)
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

        Sidequest sidequest = sidequestRepository.getRequiredSidequest(parsedSidequestId);
        validateJoinRequest(sidequest, user);

        if (!sidequestRepository.addParticipant(parsedSidequestId, user.userId(), "participant")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already joined this sidequest.");
        }

        return SidequestResponse.fromModel(sidequestRepository.getRequiredSidequest(parsedSidequestId));
    }

    @Transactional
    public SidequestDetailResponse updateSidequest(String sidequestId, UpdateSidequestRequest request, AuthenticatedUser user) {
        ensureProfileExists(user);

        UUID parsedSidequestId = parseUuid(sidequestId, "sidequestId");
        Sidequest sidequest = getExistingSidequest(parsedSidequestId);
        assertCreator(sidequest, user);
        validateUpdateRequest(request, sidequest);

        sidequestRepository.updateSidequest(parsedSidequestId, request);
        return buildDetailResponse(parsedSidequestId, user);
    }

    @Transactional
    public void deleteSidequest(String sidequestId, AuthenticatedUser user) {
        ensureProfileExists(user);

        UUID parsedSidequestId = parseUuid(sidequestId, "sidequestId");
        Sidequest sidequest = getExistingSidequest(parsedSidequestId);
        assertCreator(sidequest, user);

        sidequestRepository.deleteSidequest(parsedSidequestId);
    }

    @Transactional
    public SidequestDetailResponse completeSidequest(String sidequestId, AuthenticatedUser user) {
        ensureProfileExists(user);

        UUID parsedSidequestId = parseUuid(sidequestId, "sidequestId");
        Sidequest sidequest = getExistingSidequest(parsedSidequestId);
        assertCreator(sidequest, user);

        sidequestRepository.updateSidequestStatus(parsedSidequestId, STATUS_COMPLETED);
        return buildDetailResponse(parsedSidequestId, user);
    }

    @Transactional
    public void leaveSidequest(String sidequestId, AuthenticatedUser user) {
        ensureProfileExists(user);

        UUID parsedSidequestId = parseUuid(sidequestId, "sidequestId");
        Sidequest sidequest = getExistingSidequest(parsedSidequestId);
        if (sidequest.creatorId().equals(user.userId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Creator cannot leave their own sidequest.");
        }

        if (!sidequest.participantUserIds().contains(user.userId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "You have not joined this sidequest.");
        }

        if (!sidequestRepository.removeParticipant(parsedSidequestId, user.userId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "You have not joined this sidequest.");
        }
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

    private void validateUpdateRequest(UpdateSidequestRequest request, Sidequest sidequest) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required.");
        }

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title cannot be blank.");
        }

        if (request.description() != null && request.description().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "description cannot be blank.");
        }

        if (request.locationName() != null && request.locationName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "locationName cannot be blank.");
        }

        if ((request.latitude() == null) != (request.longitude() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude and longitude must be provided together.");
        }

        if (request.maxParticipants() != null && request.maxParticipants() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxParticipants must be at least 1.");
        }

        if (request.maxParticipants() != null && request.maxParticipants() < sidequest.participantUserIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxParticipants cannot be less than current participant count.");
        }
    }

    private void validateJoinRequest(Sidequest sidequest, AuthenticatedUser user) {
        if (!STATUS_ACTIVE.equals(resolveStatus(sidequest))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This sidequest is not active.");
        }

        if (sidequest.creatorId().equals(user.userId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot join your own sidequest.");
        }

        if (sidequest.participantUserIds().contains(user.userId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already joined this sidequest.");
        }

        if (sidequest.maxParticipants() != null
                && sidequest.participantUserIds().size() >= sidequest.maxParticipants()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This sidequest is full.");
        }
    }

    private void validateDiscoveryPagination(int limit, int offset) {
        if (limit < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be at least 0.");
        }

        if (offset < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "offset must be at least 0.");
        }
    }

    private void validateLocationQuery(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat and lng must be provided together.");
        }

        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat must be between -90 and 90.");
        }

        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lng must be between -180 and 180.");
        }
    }

    private double clampRadiusMiles(Double radiusMiles) {
        if (radiusMiles == null) {
            return DEFAULT_RADIUS_MILES;
        }

        if (Double.isNaN(radiusMiles) || Double.isInfinite(radiusMiles)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "radiusMiles must be a valid number.");
        }

        return Math.max(MIN_RADIUS_MILES, Math.min(MAX_RADIUS_MILES, radiusMiles));
    }

    private Sidequest getExistingSidequest(UUID sidequestId) {
        if (!sidequestRepository.sidequestExists(sidequestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sidequest not found.");
        }

        return sidequestRepository.getRequiredSidequest(sidequestId);
    }

    private SidequestDetailResponse buildDetailResponse(UUID sidequestId, AuthenticatedUser user) {
        Sidequest sidequest = sidequestRepository.getRequiredSidequest(sidequestId);
        SidequestUserSummary creator = sidequestRepository.findUserSummary(sidequest.creatorId())
                .orElseGet(() -> new SidequestUserSummary(sidequest.creatorId(), sidequest.creatorId().toString(), null));
        List<SidequestParticipantSummary> participants = sidequestRepository.findParticipantSummaries(sidequestId);
        return SidequestDetailResponse.fromModel(sidequest, creator, participants, user.userId(), resolveStatus(sidequest));
    }

    private void assertCreator(Sidequest sidequest, AuthenticatedUser user) {
        if (!sidequest.creatorId().equals(user.userId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sidequest creator can perform this action.");
        }
    }

    private String resolveStatus(Sidequest sidequest) {
        String status = sidequest.status() != null ? sidequest.status().trim().toLowerCase() : "active";
        if (STATUS_COMPLETED.equals(status)) {
            return STATUS_COMPLETED;
        }

        if (STATUS_DELETED.equals(status)) {
            return STATUS_DELETED;
        }

        if (sidequest.expiresAt() != null && sidequest.expiresAt().isBefore(Instant.now())) {
            return "expired";
        }

        return status.isBlank() ? STATUS_ACTIVE : status;
    }

    private UUID parseUuid(String rawValue, String fieldName) {
        try {
            return UUID.fromString(rawValue);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be a valid UUID.", exception);
        }
    }
}
