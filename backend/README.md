# Backend

This Flask backend supports two main capabilities:

- meal image analysis for calorie and macro estimation
- Google Fit activity ingestion for later dietary analysis

## Google Fit integration

The backend exposes an OAuth flow that allows a user to connect Google Fit and sync:

- steps
- calories burned
- distance
- heart rate

Synced activity is stored in a local SQLite database at `backend/nutrifit.db`.

## Required env vars

Set these in `backend/.env`:

```bash
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
GOOGLE_FIT_REDIRECT_URI=http://localhost:9510/api/google-fit/callback
GOOGLE_FIT_FRONTEND_REDIRECT=http://localhost:5173/settings
GOOGLE_FIT_STATE_SECRET=change-me
```

## API endpoints

- `POST /api/google-fit/connect`
  Body: `{"userId":"your-user-id"}`
  Returns the Google OAuth URL to open from the frontend.

- `GET /api/google-fit/callback`
  Google redirects here after consent. The backend exchanges the auth code and stores tokens.

- `POST /api/google-fit/sync`
  Body: `{"userId":"your-user-id","days":7}`
  Fetches activity from Google Fit and stores daily aggregates in SQLite.

- `GET /api/google-fit/activity?userId=your-user-id&days=7`
  Returns stored daily activity rows from the database.

## Notes

- Google Fit access is based on OAuth 2.0 scopes for activity, location, and body data.
- Tokens and daily metrics are stored server-side for later recommendation logic.
- `nutrifit.db` is ignored by Git.
