# Bloc Monorepo

Bloc is a map-based campus app where users can sign up, browse active sidequests, create their own sidequests, and join quests posted by others. Sidequests are time-boxed and expire after 24 hours.


## Repository Layout

```text
Bloc/
├── backend/    # Spring Boot service
├── frontend/   # Angular client
├── .gitignore
└── README.md
```

## Environment Variable Strategy

This repo does not commit real secrets.

- Backend uses `backend/.env` for local values and `backend/.env.example` as the committed template.
- Frontend uses Angular environment files: `frontend/src/environments/environment.ts` for local values and `frontend/src/environments/environment.example.ts` as the committed template.
- make yours with your actuall values to run
- Backend needs Postgres connection values: `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`.
- Frontend needs `apiBaseUrl`, `supabaseUrl`, and `supabasePublishableKey`.
- Use placeholder values in committed example files only.
