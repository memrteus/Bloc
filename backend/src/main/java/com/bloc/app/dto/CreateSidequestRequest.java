package com.bloc.app.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CreateSidequestRequest(
        String title,
        String description,
        String category,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Instant startsAt,
        Instant expiresAt,
        Integer maxParticipants) {
}
