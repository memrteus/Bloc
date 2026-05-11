# BUILD.md

## Prerequisites

- Java/JDK 21. The backend Gradle build uses a Java 21 toolchain.
- Gradle wrapper from `backend/gradlew`; a separate Gradle install is not required.
- Node.js and npm for the Angular frontend.
- Angular CLI is provided as a dev dependency and can be run through npm scripts or `npx ng`.
- A Supabase project with Auth and Postgres tables expected by the backend.
- A public Mapbox access token for map rendering, search, and reverse geocoding.

## Environment Variables

Use placeholders in committed files only. Put local backend values in `backend/.env` and local frontend values in `frontend/src/environments/environment.ts`.

### Backend

Found in `backend/src/main/resources/application.properties` and `backend/.env.example`:

```env
SPRING_PROFILES_ACTIVE=local
SERVER_PORT=8080
APP_NAME=bloc-backend
DB_URL=jdbc:postgresql://YOUR_HOST:5432/postgres
DB_USERNAME=your_database_username_here
DB_PASSWORD=your_database_password_here
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
SUPABASE_JWK_SET_URI=https://YOUR_PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_ISSUER=https://YOUR_PROJECT_REF.supabase.co/auth/v1
SUPABASE_AUDIENCE=authenticated
```

`DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` are required for the backend datasource. Supabase JWT validation requires either `SUPABASE_JWT_SECRET` or Supabase URL/JWKS settings, depending on the token validation mode.

### Frontend

Found in `frontend/src/environments/environment.example.ts`:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  mapboxAccessToken: 'pk.YOUR_PUBLIC_MAPBOX_TOKEN_HERE'
};
```

Create `frontend/src/environments/environment.ts` with the same shape for local development. The frontend API prefix interceptor prepends `apiBaseUrl` to relative API calls.

## Backend Setup

```bash
cd backend
cp .env.example .env
./gradlew test
./gradlew bootRun
```

The backend runs on `http://localhost:8080` by default. Spring imports `backend/.env` through `spring.config.import=optional:file:.env[.properties]`.

## Frontend Setup

```bash
cd frontend
npm install
cp src/environments/environment.example.ts src/environments/environment.ts
npm start
```

The Angular dev server runs on `http://localhost:4200` by default. The backend CORS config allows `http://localhost:4200` and `http://127.0.0.1:4200`.

## Build Commands

### Backend

```bash
cd backend
./gradlew build
```

### Frontend

```bash
cd frontend
npm run build
```

## Test Commands

### Backend

```bash
cd backend
./gradlew test
```

### Frontend

No frontend test or coverage script is currently defined in `frontend/package.json`. The configured npm scripts are:

```bash
npm start
npm run build
```

## Running the App Locally

1. Start the backend from `backend/` with `./gradlew bootRun`.
2. Start the frontend from `frontend/` with `npm start`.
3. Open `http://localhost:4200`.

## API Documentation

### Sidequests

| Endpoint | Method | Auth Required | Purpose | Success Response | Common Error Cases |
| --- | --- | --- | --- | --- | --- |
| `/api/sidequests/discover` | GET | No | Fetch active, unexpired sidequests for discovery. Supports `search`, `category`, `lat`, `lng`, `radiusMiles`, `limit`, and `offset`. | `200 OK` with list of active sidequests | `400` invalid query, `500` backend/database error |
| `/api/sidequests` | POST | Yes | Create a new sidequest | `201 Created` with created sidequest | `400` invalid input, `401` unauthenticated, `403` missing matching profile |
| `/api/sidequests/{id}` | GET | Yes | Fetch details for one sidequest | `200 OK` with sidequest details | `401` unauthenticated, `404` not found, `500` backend error |
| `/api/sidequests/{id}` | PATCH | Yes, creator only | Update a sidequest | `200 OK` with updated sidequest details | `400` invalid input, `401` unauthenticated, `403` not creator or missing profile, `404` not found |
| `/api/sidequests/{id}` | DELETE | Yes, creator only | Mark a sidequest as deleted | `204 No Content` | `401` unauthenticated, `403` not creator or missing profile, `404` not found |
| `/api/sidequests/{id}/join` | POST | Yes | Join a sidequest | `200 OK` with updated sidequest | `401` unauthenticated, `403` creator cannot join or missing profile, `404` not found, `409` already joined/full/not active |
| `/api/sidequests/{id}/participants/me` | DELETE | Yes | Leave a joined sidequest | `204 No Content` | `401` unauthenticated, `403` creator cannot leave or missing profile, `404` not found/not a participant |
| `/api/sidequests/{id}/complete` | POST | Yes, creator only | Mark a sidequest as completed | `200 OK` with completed sidequest details | `401` unauthenticated, `403` not creator or missing profile, `404` not found |
| `/api/sidequests/my-joined` | GET | Yes | Fetch sidequests joined by current user | `200 OK` with joined sidequests | `401` unauthenticated, `500` backend/database error |

### Auth and Profiles

| Endpoint | Method | Auth Required | Purpose |
| --- | --- | --- | --- |
| `/api/auth/signup` | POST | No | Create a Supabase-backed account/profile |
| `/api/auth/login` | POST | No | Log in through Supabase Auth |
| `/api/auth/logout` | POST | Yes | Log out current token |
| `/api/auth/me` | GET | Yes | Fetch current authenticated user |
| `/api/auth/me` | PATCH | Yes | Update current authenticated user |
| `/api/profiles/me` | GET | Yes | Fetch current profile |
| `/api/profiles/{id}` | GET | No | Fetch a profile by id |
| `/api/health` | GET | No | Health check |

## Implementation Notes

- The app uses HTTP polling in the Angular home view approximately every 30 seconds for refreshed sidequest data.
- The code does not implement a completed realtime pub/sub system.
- Messaging is not exposed as a completed user feature in the current codebase.
- Real secrets should stay out of version control. Use placeholder values in examples and local-only files for real credentials.
