package com.bloc.app.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.bloc.app.model.Sidequest;

public record DiscoverSidequestResponse(
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
        Instant updatedAt,
        Instant createdAt) {

    public static DiscoverSidequestResponse fromModel(Sidequest sidequest) {
        return new DiscoverSidequestResponse(
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
                sidequest.updatedAt(),
                sidequest.createdAt());
    }
}
