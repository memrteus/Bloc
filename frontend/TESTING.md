# Angular Testing Guide for Bloc Frontend

This guide covers how to write Jasmine tests for your Angular components and services using the testing framework we've set up.

## Running Tests

```bash
# Run tests in watch mode (re-runs on file changes)
npm test

# Run tests once and exit (good for CI/CD)
npm run test:ci

# Run tests with coverage report
npm run test:ci
```

## Test File Structure

Each component/service should have a corresponding `.spec.ts` file in the same directory. For example:
- Component: `login-page.component.ts` → `login-page.component.spec.ts`
- Service: `auth-api.service.ts` → `auth-api.service.spec.ts`

## Basic Test Structure

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

## Testing Services

### Services with HTTP calls

Use `HttpClientTestingModule` to mock HTTP requests:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MyService]
    });

    service = TestBed.inject(MyService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify(); // Ensures no outstanding HTTP requests
  });

  it('should fetch data', () => {
    const mockData = { id: 1, name: 'Test' };
    
    service.getData().subscribe((data) => {
      expect(data).toEqual(mockData);
    });

    const request = httpTestingController.expectOne('/api/data');
    expect(request.request.method).toBe('GET');
    request.flush(mockData);
  });
});
```

### Services with localStorage

Mock localStorage in your tests:

```typescript
describe('AuthService', () => {
  beforeEach(() => {
    spyOn(localStorage, 'getItem').and.returnValue('stored-value');
    spyOn(localStorage, 'setItem');
    spyOn(localStorage, 'removeItem');
  });

  it('should save token to localStorage', () => {
    service.saveToken('token123');
    expect(localStorage.setItem).toHaveBeenCalledWith('key', 'token123');
  });
});
```

## Testing Components

### Component with dependency injection

```typescript
describe('LoginPageComponent', () => {
  let authApiSpy: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AuthApiService', ['login']);
    
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        { provide: AuthApiService, useValue: spy }
      ]
    }).compileComponents();

    authApiSpy = TestBed.inject(AuthApiService) as jasmine.SpyObj<AuthApiService>;
  });

  it('should call login on submit', () => {
    authApiSpy.login.and.returnValue(of({}));
    component['onSubmit']();
    expect(authApiSpy.login).toHaveBeenCalled();
  });
});
```

### Component with template interaction

```typescript
it('should display error message', () => {
  component['errorMessage'] = 'Test error';
  fixture.detectChanges();

  const errorElement = fixture.debugElement.query(by.css('.error'));
  expect(errorElement.nativeElement.textContent).toContain('Test error');
});

it('should disable submit button when submitting', () => {
  component['isSubmitting'] = true;
  fixture.detectChanges();

  const button = fixture.debugElement.query(by.css('button[type="submit"]'));
  expect(button.nativeElement.disabled).toBe(true);
});
```

## Common Testing Patterns

### Testing Observable-based logic

```typescript
it('should handle async operations', (done) => {
  service.getData().subscribe(() => {
    expect(component['data']).toBeDefined();
    done(); // Signal test completion
  });

  httpTestingController.expectOne('/api/data').flush({ data: 'value' });
});
```

### Testing Router navigation

```typescript
let router: jasmine.SpyObj<Router>;

beforeEach(() => {
  const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
  TestBed.configureTestingModule({
    providers: [{ provide: Router, useValue: routerSpy }]
  });
  router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
});

it('should navigate to home after login', () => {
  router.navigateByUrl.and.returnValue(Promise.resolve(true));
  component.login();
  expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
});
```

### Testing form validation

```typescript
it('should validate form inputs', () => {
  component['email'] = '';
  component['onSubmit']();
  
  expect(component['errorMessage']).toBeTruthy();
  expect(service.submit).not.toHaveBeenCalled();
});
```

## Components to Add Tests For

Here are the remaining components that need tests:

1. **Components:**
   - `signup-page.component.ts`
   - `home-page.component.ts`
   - `profile-page.component.ts`
   - `map-page.component.ts`
   - `sidequest-detail-page.component.ts`
   - `sidequest-map.component.ts`
   - `top-nav.component.ts`
   - `page-shell.component.ts`

2. **Services:**
   - `sidequest-api.service.ts`
   - `mapbox-search.service.ts`

3. **Guards:**
   - `auth.guard.ts`

4. **Interceptors:**
   - `api-prefix.interceptor.ts`
   - `auth-token.interceptor.ts`

## Quick Start for New Tests

Copy this template for components:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YourComponent } from './your.component';

describe('YourComponent', () => {
  let component: YourComponent;
  let fixture: ComponentFixture<YourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YourComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(YourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Add more tests here
});
```

And this template for services:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [YourService]
    });

    service = TestBed.inject(YourService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Add more tests here
});
```

## Useful Jasmine Matchers

- `expect(value).toBeTruthy()` - Checks if value is truthy
- `expect(value).toBeFalsy()` - Checks if value is falsy
- `expect(value).toEqual(expected)` - Deep equality check
- `expect(value).toBe(expected)` - Strict equality check (===)
- `expect(array).toContain(element)` - Checks if array contains element
- `expect(fn).toHaveBeenCalled()` - Checks if function was called
- `expect(fn).toHaveBeenCalledWith(args)` - Checks function called with specific args
- `expect(value).toThrow()` - Checks if function throws error

## Coverage Reports

After running tests with coverage, view the report at:
```
coverage/bloc-frontend/index.html
```

## Tips for Better Tests

1. **Test behavior, not implementation** - Focus on what the component does, not how it does it
2. **Use descriptive test names** - Make it clear what each test is validating
3. **Keep tests focused** - One test should verify one thing
4. **Mock external dependencies** - Don't test services your code depends on
5. **Test edge cases** - Empty inputs, null values, error states
6. **Use beforeEach** - Set up common test fixtures
7. **Clean up after tests** - Use afterEach for cleanup (like unsubscribing)

## Resources

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Angular Testing Best Practices](https://angular.io/guide/testing-code-coverage)
