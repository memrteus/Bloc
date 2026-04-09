package com.bloc.app.dto;

import java.math.BigDecimal;

public record CreateSidequestRequest(
        String title,
        String description,
        String category,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer maxParticipants) {
}
