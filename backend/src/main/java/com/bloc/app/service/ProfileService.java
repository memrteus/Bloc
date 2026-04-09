package com.bloc.app.service;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.dto.ProfileResponse;
import com.bloc.app.repository.ProfileRepository;
import com.bloc.app.security.AuthenticatedUser;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;

    public ProfileService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getCurrentProfile(AuthenticatedUser authenticatedUser) {
        return profileRepository.findProfileById(authenticatedUser.userId())
                .map(ProfileService::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Profile not found for authenticated user."));
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfileById(String profileId) {
        UUID parsedProfileId = parseUuid(profileId);

        return profileRepository.findProfileById(parsedProfileId)
                .map(ProfileService::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found."));
    }

    private static ProfileResponse toResponse(ProfileRepository.ProfileSummary profile) {
        return new ProfileResponse(
                profile.id().toString(),
                profile.username(),
                profile.fullName(),
                profile.umassEmail(),
                profile.avatarUrl(),
                profile.bio());
    }

    private UUID parseUuid(String profileId) {
        try {
            return UUID.fromString(profileId);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profileId must be a valid UUID.", exception);
        }
    }
}
