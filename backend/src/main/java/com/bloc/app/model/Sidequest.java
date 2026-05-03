package com.bloc.app.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Sidequest(
        UUID id,
        UUID creatorId,
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
        Instant createdAt,
        Instant updatedAt,
        List<UUID> participantUserIds,
        List<String> participantDisplayNames) {
}
