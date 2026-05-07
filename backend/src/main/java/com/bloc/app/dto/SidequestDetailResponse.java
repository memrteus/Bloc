package com.bloc.app.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.bloc.app.model.Sidequest;
import com.bloc.app.repository.SidequestRepository.SidequestParticipantSummary;
import com.bloc.app.repository.SidequestRepository.SidequestUserSummary;

public record SidequestDetailResponse(
        UUID id,
        String title,
        String description,
        String category,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Instant startsAt,
        Instant expiresAt,
        Integer maxParticipants,
        String status,
        BigDecimal distanceMiles,
        Instant updatedAt,
        Instant createdAt,
        UserSummary creator,
        List<ParticipantSummary> participants,
        int participantCount,
        boolean currentUserIsCreator,
        boolean currentUserHasJoined) {

    public static SidequestDetailResponse fromModel(
            Sidequest sidequest,
            SidequestUserSummary creator,
            List<SidequestParticipantSummary> participants,
            UUID currentUserId,
            String resolvedStatus) {
        List<ParticipantSummary> participantResponses = participants.stream()
                .map(ParticipantSummary::fromRepository)
                .toList();

        return new SidequestDetailResponse(
                sidequest.id(),
                sidequest.title(),
                sidequest.description(),
                sidequest.category(),
                sidequest.locationName(),
                sidequest.latitude(),
                sidequest.longitude(),
                sidequest.startsAt(),
                sidequest.expiresAt(),
                sidequest.maxParticipants(),
                resolvedStatus,
                sidequest.distanceMiles(),
                sidequest.updatedAt(),
                sidequest.createdAt(),
                UserSummary.fromRepository(creator),
                participantResponses,
                participantResponses.size(),
                sidequest.creatorId().equals(currentUserId),
                participants.stream().anyMatch(participant -> participant.id().equals(currentUserId)));
    }

    public record UserSummary(
            UUID id,
            String displayName,
            String avatarUrl) {

        static UserSummary fromRepository(SidequestUserSummary user) {
            return new UserSummary(user.id(), user.displayName(), user.avatarUrl());
        }
    }

    public record ParticipantSummary(
            UUID id,
            String displayName,
            String avatarUrl,
            Instant joinedAt) {

        static ParticipantSummary fromRepository(SidequestParticipantSummary participant) {
            return new ParticipantSummary(
                    participant.id(),
                    participant.displayName(),
                    participant.avatarUrl(),
                    participant.joinedAt());
        }
    }
}
