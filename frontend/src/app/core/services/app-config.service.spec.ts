import { TestBed } from '@angular/core/testing';
import { AppConfigService } from './app-config.service';
import { environment } from '../../../environments/environment';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppConfigService]
    });
    service = TestBed.inject(AppConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose environment configuration', () => {
    expect(service.environment).toBe(environment);
  });

  it('should have API base URL configured', () => {
    expect(service.environment.apiBaseUrl).toBeDefined();
    expect(typeof service.environment.apiBaseUrl).toBe('string');
  });

  it('should have Supabase URL configured', () => {
    expect(service.environment.supabaseUrl).toBeDefined();
    expect(typeof service.environment.supabaseUrl).toBe('string');
  });

  it('should have Supabase publishable key configured', () => {
    expect(service.environment.supabasePublishableKey).toBeDefined();
    expect(typeof service.environment.supabasePublishableKey).toBe('string');
  });

  it('should have Mapbox access token configured', () => {
    expect(service.environment.mapboxAccessToken).toBeDefined();
    expect(typeof service.environment.mapboxAccessToken).toBe('string');
  });

  it('should indicate production status', () => {
    expect(service.environment.production).toBeDefined();
    expect(typeof service.environment.production).toBe('boolean');
  });
});
