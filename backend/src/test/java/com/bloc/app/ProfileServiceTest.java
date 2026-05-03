package com.bloc.app;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.bloc.app.dto.ProfileResponse;
import com.bloc.app.repository.ProfileRepository;
import com.bloc.app.security.AuthenticatedUser;
import com.bloc.app.service.ProfileService;

class ProfileServiceTest {

    @Test
    void getCurrentProfileReturnsProfileForAuthenticatedUser() {
        UUID userId = UUID.fromString("77777777-7777-7777-7777-777777777777");
        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        when(profileRepository.findProfileById(userId)).thenReturn(Optional.of(new ProfileRepository.ProfileSummary(
                userId,
                "blocuser",
                "Bloc User",
                "bloc@umass.edu",
                null,
                "Ready to quest")));

        ProfileService profileService = new ProfileService(profileRepository);

        ProfileResponse response = profileService.getCurrentProfile(new AuthenticatedUser(userId, "bloc@umass.edu"));

        assertEquals(userId.toString(), response.id());
        assertEquals("blocuser", response.username());
        assertEquals("Ready to quest", response.bio());
    }

    @Test
    void getCurrentProfileRejectsMissingProfile() {
        UUID userId = UUID.fromString("88888888-8888-8888-8888-888888888888");
        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        when(profileRepository.findProfileById(userId)).thenReturn(Optional.empty());

        ProfileService profileService = new ProfileService(profileRepository);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> profileService.getCurrentProfile(new AuthenticatedUser(userId, "missing@umass.edu")));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Profile not found for authenticated user.", exception.getReason());
    }

    @Test
    void getProfileByIdRejectsInvalidUuid() {
        ProfileRepository profileRepository = Mockito.mock(ProfileRepository.class);
        ProfileService profileService = new ProfileService(profileRepository);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> profileService.getProfileById("not-a-uuid"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("profileId must be a valid UUID.", exception.getReason());
    }
}
