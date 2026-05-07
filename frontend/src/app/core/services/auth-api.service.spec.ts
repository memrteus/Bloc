import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthApiService, LoginRequest, LoginResponse, SignupRequest, SignupResponse, CurrentUserResponse } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthApiService]
    });

    service = TestBed.inject(AuthApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('should send login request and store tokens in localStorage', () => {
      const loginRequest: LoginRequest = { email: 'test@example.com', password: 'password123' };
      const loginResponse: LoginResponse = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        tokenType: 'Bearer',
        expiresIn: 3600,
        userId: 'user-id-789',
        email: 'test@example.com'
      };

      service.login(loginRequest).subscribe((response) => {
        expect(response).toEqual(loginResponse);
        expect(localStorage.getItem('bloc.accessToken')).toBe('access-token-123');
        expect(localStorage.getItem('bloc.refreshToken')).toBe('refresh-token-456');
        expect(localStorage.getItem('bloc.userEmail')).toBe('test@example.com');
        expect(localStorage.getItem('bloc.userId')).toBe('user-id-789');
      });

      const request = httpTestingController.expectOne('/auth/login');
      expect(request.request.method).toBe('POST');
      request.flush(loginResponse);
    });

    it('should handle login without optional fields', () => {
      const loginRequest: LoginRequest = { email: 'test@example.com', password: 'password123' };
      const loginResponse: LoginResponse = {
        accessToken: null,
        refreshToken: null,
        tokenType: null,
        expiresIn: null,
        userId: null,
        email: null
      };

      service.login(loginRequest).subscribe();

      const request = httpTestingController.expectOne('/auth/login');
      request.flush(loginResponse);

      expect(localStorage.getItem('bloc.accessToken')).toBeNull();
      expect(localStorage.getItem('bloc.refreshToken')).toBeNull();
    });
  });

  describe('signup', () => {
    it('should send signup request with all fields', () => {
      const signupRequest: SignupRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
        fullName: 'New User'
      };
      const signupResponse: SignupResponse = {
        message: 'Signup successful',
        userId: 'new-user-id',
        email: 'newuser@example.com',
        emailConfirmationRequired: true,
        profileCreated: true
      };

      service.signup(signupRequest).subscribe((response) => {
        expect(response).toEqual(signupResponse);
      });

      const request = httpTestingController.expectOne('/auth/signup');
      expect(request.request.method).toBe('POST');
      request.flush(signupResponse);
    });

    it('should send signup request with minimal fields', () => {
      const signupRequest: SignupRequest = {
        email: 'minimal@example.com',
        password: 'password123'
      };

      service.signup(signupRequest).subscribe();

      const request = httpTestingController.expectOne('/auth/signup');
      expect(request.request.body).toEqual(signupRequest);
      request.flush({});
    });
  });

  describe('logout', () => {
    it('should send logout request', () => {
      service.logout().subscribe();

      const request = httpTestingController.expectOne('/auth/logout');
      expect(request.request.method).toBe('POST');
      request.flush(null);
    });
  });

  describe('clearSession', () => {
    it('should remove all session data from localStorage', () => {
      localStorage.setItem('bloc.accessToken', 'token123');
      localStorage.setItem('bloc.refreshToken', 'refresh123');
      localStorage.setItem('bloc.userEmail', 'user@example.com');
      localStorage.setItem('bloc.userId', 'user123');

      service.clearSession();

      expect(localStorage.getItem('bloc.accessToken')).toBeNull();
      expect(localStorage.getItem('bloc.refreshToken')).toBeNull();
      expect(localStorage.getItem('bloc.userEmail')).toBeNull();
      expect(localStorage.getItem('bloc.userId')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user data', () => {
      const currentUser: CurrentUserResponse = {
        userId: 'user-123',
        email: 'user@example.com',
        username: 'username',
        fullName: 'Full Name',
        umassEmail: 'user@umass.edu',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'User bio'
      };

      service.getCurrentUser().subscribe((response) => {
        expect(response).toEqual(currentUser);
      });

      const request = httpTestingController.expectOne('/auth/me');
      expect(request.request.method).toBe('GET');
      request.flush(currentUser);
    });
  });
});
