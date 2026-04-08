package com.bloc.app.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.bloc.app.model.Sidequest;

public record SidequestResponse(
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
        UUID creatorId,
        List<UUID> participantUserIds,
        Instant updatedAt,
        Instant createdAt) {

    public static SidequestResponse fromModel(Sidequest sidequest) {
        return new SidequestResponse(
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
                sidequest.status(),
                sidequest.creatorId(),
                sidequest.participantUserIds(),
                sidequest.updatedAt(),
                sidequest.createdAt());
    }
}
