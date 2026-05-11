# Bloc

## Overview

Bloc helps students create, discover, and join short-term campus activities called sidequests. The app combines an Angular frontend with a Spring Boot API backed by Supabase Auth/Postgres, with map-based discovery through Mapbox and browser geolocation.

## Features

- Authentication, signup, login, logout, and current-user profile flows.
- Sidequest creation for authenticated users with title, description, category, location, coordinates, and max participants.
- Sidequest discovery with active, unexpired results, search, category, pagination, and optional location radius filters.
- Sidequest details for authenticated users, including creator and participant summaries.
- Join sidequest and leave joined sidequest.
- My Sidequests / joined-sidequests view for the current user.
- Map and location-based discovery using Mapbox and browser geolocation.
- Creator-only update, delete, and complete actions.
- Polling-based refresh in the main Angular home view around every 30 seconds.

### Planned/Future Work

- Full realtime pub/sub updates.
- Complete sidequest messaging.
- Mobile polish.
- Media attachments.
- Better filtering/search.

## Tech Stack

- Angular 17 / TypeScript frontend.
- Spring Boot 3.3 / Java 21 backend.
- Supabase Auth/Postgres.
- Mapbox GL JS and Mapbox Search/geocoding.
- Project planning notes live under `docs/`.

## Repository Structure

```text
Bloc/
├── backend/              # Spring Boot API, Gradle wrapper, backend tests
├── frontend/             # Angular app, npm scripts, Mapbox UI
├── docs/                 # Project notes and manual request examples
├── README.md
└── BUILD.md
```

## Quick Start

See [BUILD.md](BUILD.md) for full setup, environment variables, commands, and API details.

## Testing

Backend tests are configured through Gradle:

```bash
cd backend
./gradlew test
```

The frontend currently has `start` and `build` npm scripts, but no `test` or coverage script in `frontend/package.json`.

## API Summary

The implemented sidequest API differs from the proposed table in a few places: discovery is `GET /api/sidequests/discover`, sidequest details are authenticated, and leave uses `DELETE /api/sidequests/{id}/participants/me`.

| Endpoint | Method | Auth Required | Purpose | Success Response | Common Error Cases |
| --- | --- | --- | --- | --- | --- |
| `/api/sidequests/discover` | GET | No | Fetch active, unexpired sidequests for discovery | `200 OK` with discoverable sidequests | `400` invalid query, `500` backend/database error |
| `/api/sidequests` | POST | Yes | Create a new sidequest | `201 Created` with created sidequest | `400` invalid input, `401` unauthenticated, `403` missing matching profile |
| `/api/sidequests/{id}` | GET | Yes | Fetch details for one sidequest | `200 OK` with sidequest details | `401` unauthenticated, `404` not found, `500` backend error |
| `/api/sidequests/{id}` | PATCH | Yes, creator only | Update a sidequest | `200 OK` with updated sidequest details | `400` invalid input, `401` unauthenticated, `403` not creator or missing profile, `404` not found |
| `/api/sidequests/{id}` | DELETE | Yes, creator only | Mark a sidequest as deleted | `204 No Content` | `401` unauthenticated, `403` not creator or missing profile, `404` not found |
| `/api/sidequests/{id}/join` | POST | Yes | Join a sidequest | `200 OK` with updated sidequest | `401` unauthenticated, `403` creator cannot join or missing profile, `404` not found, `409` already joined/full/not active |
| `/api/sidequests/{id}/participants/me` | DELETE | Yes | Leave a joined sidequest | `204 No Content` | `401` unauthenticated, `403` creator cannot leave or missing profile, `404` not found/not a participant |
| `/api/sidequests/{id}/complete` | POST | Yes, creator only | Mark a sidequest as completed | `200 OK` with completed sidequest details | `401` unauthenticated, `403` not creator or missing profile, `404` not found |
| `/api/sidequests/my-joined` | GET | Yes | Fetch sidequests joined by current user | `200 OK` with joined sidequests | `401` unauthenticated, `500` backend/database error |

