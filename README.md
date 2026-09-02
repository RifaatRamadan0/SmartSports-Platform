# SmartSports Platform

A sports pitch booking system where players reserve time slots, open their games to strangers who need a team, and pitch owners manage their facilities.

ASP.NET Core 8 Web API with a React frontend, PostgreSQL behind Dapper and hand-written SQL, JWT auth with refresh-token rotation, email and phone verification, and image hosting on ImageKit.

## Roles

Three roles, each with a different view of the same data.

| Role | Can do |
|---|---|
| Player | Browse pitches, book slots, open a match to joiners, invite players, request to join open matches, review pitches after playing, favourite pitches |
| Pitch owner | Register pitches, set weekly opening hours, manage the photo gallery, view and cancel incoming bookings |
| Admin | Approve or reject pitch submissions, handle pitch-owner role requests, ban and delete users |

A new account is a Player. Becoming a pitch owner is a request an admin approves, and a pitch is not visible to anyone until an admin approves it separately.

### Booking and match lifecycle

A booking and a match are created in the same transaction: reserving a slot always produces a match, and the match is what other players interact with.

```
Player books a slot  →  booking (confirmed) + match created together
                              ↓
        match is private, or opened to join by its host
                              ↓
   invite by username  ·  invite link  ·  open match browsing
                              ↓
     participant: pending → accepted / rejected  (host decides)
```

Bookings are `pending`, `confirmed` or `cancelled`. Either side can cancel: the player from their bookings list, the owner with a reason. Both write a notification to everyone affected, and a cancelled booking frees its slot for rebooking.

Pitches move through `PendingApproval → Approved` or `Rejected`, with a rejection reason the owner can read. Role requests follow the same three states.

Reviews are tied to a booking, not a pitch, so a player can only review a pitch they actually booked, once per booking. Each new review recalculates the pitch's average rating with the pitch row locked, so two reviews landing together cannot lose an update.

## Features

**Preventing double bookings.** Two people tapping *Book* on the same 18:00 slot is the core correctness problem in the system. Checking availability with a `SELECT` and then inserting leaves a gap where both requests read "free" before either writes.

Three layers close it. The transaction takes a `pg_advisory_xact_lock` keyed on pitch and date, so concurrent requests for the same pitch and day queue up rather than racing. The conflict check then compares intervals (`start < @End AND end > @Start`) rather than exact start times, so a 17:30–19:00 booking correctly blocks 18:00–19:00. Behind both sits a partial unique index the application cannot bypass:

```sql
CREATE UNIQUE INDEX uq_bookings_active_slot
    ON bookings (pitch_id, booking_date, start_time)
    WHERE status <> 'cancelled';
```

The `WHERE` clause is the point. The original constraint covered every row, so cancelling a booking permanently burned that slot and nobody could rebook it. Filtering on status expresses the real rule: one *active* booking per slot. A unique violation from this index is caught and returned as the same `409 Conflict` the application check produces.

**Availability.** `GET /api/pitches/{id}/availability?date=` builds 30-minute slots from the owner's weekly schedule for that weekday, subtracts booked intervals, and drops slots without enough consecutive free time to satisfy the pitch's minimum booking duration. An empty list means the pitch is closed that day.

**Auth.** Access tokens last 15 minutes, refresh tokens 7 days. Refresh tokens are stored only as a hash, so reading the database yields nothing usable to sign in with. Each refresh revokes the token it consumed and issues a new one, leaving other devices alone. The frontend does this silently: an axios response interceptor catches a 401, refreshes once, and replays the original request.

The JWT signing key is validated at startup. If `Jwt:Secret` is not base64 of at least 32 bytes the app refuses to boot, rather than quietly running HS256 on a weak key. Passwords are hashed with BCrypt. Email verification goes through Resend, phone verification through Twilio Verify.

Rate limits are per IP and fixed-window: 10/min on auth, 30/min on availability, 60/min on lookups.

**Joining matches.** A host can open a match to joiners, invite specific users, or generate a single-use invite link that works for anyone who has it. Join requests sit as `pending` participants until the host accepts or rejects them. Every outcome (invited, accepted, rejected, someone left, booking cancelled) writes a notification row, typed against a Postgres enum through constants in `NotificationTypes` so a mismatch fails at compile time instead of at runtime.

What players actually see today is the inbox in the navbar, which reads pending invitations and pending join requests directly and acts on them inline. The notification rows are written but not yet surfaced. See the last section.

**Images.** Pitch photos are uploaded straight from the browser to ImageKit. The backend only signs the upload, so image bytes never pass through the API. Owners pick one image as the cover.

**Migrations.** Plain `.sql` files in `SmartSports.DAL/Scripts/`, embedded as resources and applied at startup by `MigrationRunner`. Each runs in its own transaction and is recorded in `schema_migrations`, so a failure rolls back cleanly and the app will not start on a half-applied schema. 34 so far.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Base UI, Framer Motion, axios |
| Backend | ASP.NET Core 8 Web API, Swagger |
| Data | PostgreSQL 16, Dapper, Npgsql, hand-written SQL |
| Auth | JWT bearer, refresh-token rotation, BCrypt |
| Other | Resend for email, Twilio Verify for SMS, ImageKit for images |

Dapper rather than EF Core is deliberate: the query that runs is the query in the file, which matters for the locking above and keeps the list endpoints off N+1 selects.

## Architecture

Four projects. Dependencies point one way, enforced by project references.

```
backend/
├── SmartSports.Domain/   entities, projections, enums, exceptions. No dependencies
├── SmartSports.DAL/      Dapper repositories, SQL migrations, connection factory
├── SmartSports.BLL/      services, DTOs, validation, authorisation rules
└── SmartSports.API/      controllers, middleware, JWT and rate limiting, DI setup

frontend/
└── src/
    ├── pages/            one folder per area: Pitches, Booking, Match, Admin, Owner…
    ├── services/         one axios module per API area, plus the auth interceptor
    ├── context/          auth and toast providers
    └── components/, hooks/, lib/, utils/
```

**The API project has no reference to the DAL.** A controller physically cannot open a connection or write a query; it has to go through a BLL service. That is what keeps SQL out of controllers as the project grows.

Controllers stay thin: read the user id from the JWT claims, call a service, map the result to a status code. Role gating sits on the controller as policy attributes, but that only decides who may call an endpoint. Whether *this* user owns *this* pitch or match is decided in the service layer. A global exception middleware translates domain exceptions into status codes, so `ConflictException` becomes 409 and `ForbiddenException` becomes 403 in one place instead of in every action.

### Data model

21 tables: users, roles, user_roles, pitches, pitch_images, pitch_weekly_schedules, bookings, matches, match_participants, invitations, reviews, notifications, role_requests, user_favorite_pitches, regions, cities, sport_types, refresh_tokens, password_reset_tokens, email_verification_tokens, chat_messages.

Roles, Lebanese regions and cities, and sport types are seeded by migration, so a fresh database comes up usable. `chat_messages` exists but is unused. See the last section.

## API

76 endpoints under `/api`. Pitch browsing, availability, open matches and lookups are anonymous; everything else needs a bearer token.

| Method | Route | Who |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout` | anyone |
| GET/POST | `/api/auth/verify-email`, `/forgot-password`, `/reset-password`, `/phone/*` | anyone |
| GET | `/api/pitches`, `/api/pitches/{id}` | anyone |
| GET | `/api/pitches/{id}/availability`, `/api/pitches/{id}/schedule` | anyone |
| POST/PUT/DELETE | `/api/pitches`, `/api/pitches/{id}` | Pitch owner |
| GET | `/api/pitches/mine`, `/api/pitches/mine/{id}` | Pitch owner |
| GET/POST/PATCH/DELETE | `/api/pitches/mine/{id}/images/*` | Pitch owner |
| PUT | `/api/pitches/{id}/schedule` | Pitch owner |
| POST | `/api/pitches/{id}/favorite` | Player |
| POST | `/api/bookings` | Player |
| PATCH | `/api/bookings/{id}/cancel` | Player |
| PATCH | `/api/bookings/{id}/owner-cancel` | Pitch owner |
| GET | `/api/bookings/my` | Player |
| GET | `/api/bookings/owner` | Pitch owner |
| GET | `/api/matches/open`, `/api/matches/{id}`, `/api/matches/stats` | anyone |
| GET/PATCH/POST/DELETE | `/api/matches/my`, `/{id}/join`, `/{id}/leave`, `/{id}/visibility` | Player |
| GET/PATCH | `/api/matches/join-requests/pending`, `/{id}/participants/{userId}/respond` | Player |
| POST/GET/PUT | `/api/matches/{id}/invitations`, `/api/invitations/*` | Player |
| POST | `/api/matches/{id}/invite-link` | Player |
| GET/POST | `/api/join/{token}` | anyone / Player |
| POST | `/api/bookings/{id}/reviews` | Player |
| POST/GET | `/api/roles/request`, `/api/roles/my-requests` | signed in |
| GET/PATCH/DELETE | `/api/admin/pitches`, `/role-requests`, `/users` | Admin |
| GET/PUT/PATCH/DELETE | `/api/users/me`, `/me/password`, `/me/favorites`, `/me/phone/*` | signed in |
| GET | `/api/lookups/*`, `/api/cities`, `/api/sport-types` | anyone, cached 1h |
| GET | `/api/uploads/imagekit-auth` | signed in |

Swagger UI is on at `/swagger` in development.

## Running it locally

<details>
<summary>Setup steps for database, backend and frontend</summary>

You need .NET 8 SDK, Node 18 or newer, and PostgreSQL 16.

**Database.** Point at a local instance, or start one:

```bash
cp .env.example .env && docker compose up -d
```

That also brings up pgAdmin on `http://localhost:5050`.

**Backend**

```bash
cp backend/SmartSports.API/appsettings.Development.example.json backend/SmartSports.API/appsettings.Development.json
dotnet run --project backend/SmartSports.API
```

Fill in the connection string first. Generate the JWT key with `openssl rand -base64 48`. Resend, Twilio and ImageKit values are required, because the app validates them at startup and will not boot without them. Migrations run automatically, so there is no separate step.

The API prints its port; it is `http://localhost:5079` by default, Swagger at `/swagger`.

**Frontend**

```bash
cd frontend && cp .env.example .env && npm install && npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:5079` in `frontend/.env`, plus the two ImageKit public values. Add the Vite origin to `Cors:AllowedOrigins` on the backend or the browser blocks every request.

</details>

## Configuration

<details>
<summary>Config keys</summary>

| Key | What it is |
|---|---|
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection string |
| `Jwt:Secret` | signing key, base64, at least 32 raw bytes. Validated at startup |
| `Jwt:Issuer`, `Jwt:Audience` | `SmartSports` and `SmartSportsClient`, in `appsettings.json` |
| `Jwt:AccessTokenExpiryMinutes` | `15` |
| `Jwt:RefreshTokenExpiryDays` | `7`, falls back to 7 in code if unset |
| `Cors:AllowedOrigins` | frontend origins |
| `Resend:ApiKey`, `Resend:FromEmail` | verification and password-reset email |
| `Twilio:AccountSid`, `AuthToken`, `VerifyServiceSid` | phone verification |
| `ImageKit:PrivateKey` | signs browser uploads |
| `Frontend:BaseUrl` | used to build links inside emails |
| `VITE_API_BASE_URL` | frontend only, base URL of the API |

Nothing secret is committed. `appsettings.json` holds only non-sensitive defaults; `appsettings.Development.json` is gitignored.

</details>

## Future plans

- **Surfacing notifications.** Notification rows are written on every booking, invitation and join event, but no endpoint reads them back and no UI shows them. A `GET /api/notifications` with an unread count and a mark-read call is the missing piece; the inbox in the navbar covers pending invitations and join requests in the meantime.
- **Real time.** Everything is request/response today. SignalR would push notifications instead of leaving them to be fetched, and is a prerequisite for chat below.
- **In-match chat.** The `chat_messages` table and `ChatMessage` entity exist, but there is no repository, service or UI behind them.
- **AI slot recommendations and demand forecasting.** The original goal for the project: suggest the best time to play from historical booking density, and give owners a utilisation forecast. No model or service exists yet.
- **Owner analytics.** Owners can list their bookings, but there is no revenue or utilisation reporting.
- **Automated tests.** There is no test project; everything was verified by hand through Swagger and direct SQL. A suite around the booking concurrency rules and the availability calculation is the first thing to add, since those two carry the most logic.
- **Deployment.** Runs locally only. There is a Dockerfile for the API but nothing is hosted yet.

## License

MIT. See [LICENSE](LICENSE).
