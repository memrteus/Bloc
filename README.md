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

- `backend/.env.example` documents the variables expected by the Spring Boot service.
- `frontend/.env.example` documents the variables expected by the Angular client build/runtime setup.
- Developers should copy each example file into a local, ignored env file as needed for their own machine.
- Keep environment-specific values out of source control from the beginning, even while the project is still in scaffold mode.
