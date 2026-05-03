package com.bloc.app.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bloc.app.dto.ProfileResponse;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.service.ProfileService;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        return profileService.getCurrentProfile(AuthenticatedUser.fromJwt(jwt));
    }

    @GetMapping("/{id}")
    public ProfileResponse getProfileById(@PathVariable String id) {
        return profileService.getProfileById(id);
    }
}
