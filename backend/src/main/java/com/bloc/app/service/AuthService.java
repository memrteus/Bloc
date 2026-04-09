package com.bloc.app.service;

import com.bloc.app.dto.CurrentUserResponse;
import com.bloc.app.dto.LoginRequest;
import com.bloc.app.dto.LoginResponse;
import com.bloc.app.dto.SignupRequest;
import com.bloc.app.dto.SignupResponse;
import com.bloc.app.security.AuthenticatedUser;

public interface AuthService {

    SignupResponse signup(SignupRequest request);

    LoginResponse login(LoginRequest request);

    CurrentUserResponse getCurrentUser(AuthenticatedUser authenticatedUser);
}
