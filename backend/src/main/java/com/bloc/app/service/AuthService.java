package com.bloc.app.service;

import com.bloc.app.dto.CurrentUserResponse;
import com.bloc.app.dto.CurrentUserUpdateRequest;
import com.bloc.app.dto.LoginRequest;
import com.bloc.app.dto.LoginResponse;
import com.bloc.app.dto.SignupRequest;
import com.bloc.app.dto.SignupResponse;
import com.bloc.app.security.AuthenticatedUser;

public interface AuthService {

    SignupResponse signup(SignupRequest request);

    LoginResponse login(LoginRequest request);

    void logout(String accessToken);

    CurrentUserResponse getCurrentUser(AuthenticatedUser authenticatedUser);

    CurrentUserResponse updateCurrentUser(AuthenticatedUser authenticatedUser, CurrentUserUpdateRequest request);
}
