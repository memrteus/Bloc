package com.bloc.app.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.dto.DiscoverSidequestResponse;
import com.bloc.app.dto.SidequestDetailResponse;
import com.bloc.app.dto.SidequestResponse;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.service.SidequestService;

@RestController
@RequestMapping("/api/sidequests")
public class SidequestController {

    private final SidequestService sidequestService;

    public SidequestController(SidequestService sidequestService) {
        this.sidequestService = sidequestService;
    }

    @GetMapping("/discover")
    public List<DiscoverSidequestResponse> discoverSidequests(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusMiles,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return sidequestService.discoverSidequests(search, category, lat, lng, radiusMiles, limit, offset);
    }

    @GetMapping("/my-joined")
    public List<DiscoverSidequestResponse> getMyJoinedSidequests(@AuthenticationPrincipal Jwt jwt) {
        return sidequestService.getMyJoinedSidequests(AuthenticatedUser.fromJwt(jwt));
    }

    @GetMapping("/{sidequestId}")
    public SidequestDetailResponse getSidequest(
            @PathVariable String sidequestId,
            @AuthenticationPrincipal Jwt jwt) {
        return sidequestService.getSidequest(sidequestId, AuthenticatedUser.fromJwt(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SidequestResponse createSidequest(
            @RequestBody CreateSidequestRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return sidequestService.createSidequest(request, AuthenticatedUser.fromJwt(jwt));
    }

    @PostMapping("/{sidequestId}/join")
    public SidequestResponse joinSidequest(
            @PathVariable String sidequestId,
            @AuthenticationPrincipal Jwt jwt) {
        return sidequestService.joinSidequest(sidequestId, AuthenticatedUser.fromJwt(jwt));
    }
}
