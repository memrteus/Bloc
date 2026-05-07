package com.bloc.app.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record UpdateSidequestRequest(
        String title,
        String description,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer maxParticipants,
        Instant expiresAt) {
}
