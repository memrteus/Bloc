import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { AuthApiService } from '../../core/services/auth-api.service';
import { of, throwError } from 'rxjs';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let authApiService: jasmine.SpyObj<AuthApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authApiSpy = jasmine.createSpyObj('AuthApiService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, HttpClientTestingModule],
      providers: [
        { provide: AuthApiService, useValue: authApiSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    authApiService = TestBed.inject(AuthApiService) as jasmine.SpyObj<AuthApiService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty email and password', () => {
    expect(component['email']).toBe('');
    expect(component['password']).toBe('');
    expect(component['isSubmitting']).toBe(false);
    expect(component['errorMessage']).toBe('');
  });

  describe('onSubmit', () => {
    it('should show error if email is empty', () => {
      component['email'] = '';
      component['password'] = 'password';

      component['onSubmit']();

      expect(component['errorMessage']).toBe('Enter your email and password.');
      expect(authApiService.login).not.toHaveBeenCalled();
    });

    it('should show error if password is empty', () => {
      component['email'] = 'test@umass.edu';
      component['password'] = '';

      component['onSubmit']();

      expect(component['errorMessage']).toBe('Enter your email and password.');
      expect(authApiService.login).not.toHaveBeenCalled();
    });

    it('should call authApi.login with email and password', () => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      authApiService.login.and.returnValue(of({ accessToken: 'token' } as any));

      component['onSubmit']();

      expect(authApiService.login).toHaveBeenCalledWith({
        email: 'test@umass.edu',
        password: 'password123'
      });
    });

    it('should set isSubmitting to true during login', () => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      authApiService.login.and.returnValue(of({ accessToken: 'token' } as any));

      component['onSubmit']();

      expect(component['isSubmitting']).toBe(true);
    });

    it('should navigate to home on successful login', (done) => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      authApiService.login.and.returnValue(of({ accessToken: 'token' } as any));
      router.navigateByUrl.and.returnValue(Promise.resolve(true));

      component['onSubmit']();

      setTimeout(() => {
        expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
        expect(component['isSubmitting']).toBe(false);
        done();
      }, 0);
    });

    it('should clear error message before login attempt', () => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      component['errorMessage'] = 'Previous error';
      authApiService.login.and.returnValue(of({ accessToken: 'token' } as any));

      component['onSubmit']();

      expect(component['errorMessage']).toBe('');
    });

    it('should handle login error with string error message', (done) => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      const errorResponse = { error: 'Invalid credentials' };
      authApiService.login.and.returnValue(throwError(() => errorResponse));

      component['onSubmit']();

      setTimeout(() => {
        expect(component['errorMessage']).toBe('Invalid credentials');
        expect(component['isSubmitting']).toBe(false);
        done();
      }, 0);
    });

    it('should handle login error with error.message property', (done) => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      const errorResponse = { error: { message: 'Login failed' } };
      authApiService.login.and.returnValue(throwError(() => errorResponse));

      component['onSubmit']();

      setTimeout(() => {
        expect(component['errorMessage']).toBe('Login failed');
        expect(component['isSubmitting']).toBe(false);
        done();
      }, 0);
    });

    it('should use default error message for unknown errors', (done) => {
      component['email'] = 'test@umass.edu';
      component['password'] = 'password123';
      authApiService.login.and.returnValue(throwError(() => ({})));

      component['onSubmit']();

      setTimeout(() => {
        expect(component['errorMessage']).toBe('Login failed. Check your credentials and try again.');
        expect(component['isSubmitting']).toBe(false);
        done();
      }, 0);
    });
  });
});
