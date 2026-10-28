# Vanuatu Smart Transport

Mobile transport platform for passengers, drivers, and transport administrators in Vanuatu. The workspace contains an Expo React Native app for Android/iOS, a NestJS API, and a PostgreSQL/PostGIS database.

## Implemented functionality

- Account registration and login with passenger/driver roles, persisted sessions, and driver verification status.
- Passenger discovery of available services and scheduled bus trips, booking requests, booking history, and incident reports.
- Driver dashboards, service availability, scheduled bus trips, booking management, and trip history.
- Administrator driver review (verify, reject, suspend), trip administration, and incident review.
- Offline caches for trips and passenger/driver bookings.
- Password recovery by SMS using a configurable HTTP gateway.
- Guest tourist transfers and private tours: browse verified drivers, submit or cancel pending requests, receive/confirm quotes, and securely check requests with a private access code.
- Drivers use their existing account for normal transport or tourist transport. Once driver registration is verified, they can publish tourist listings with Vanuatu-time availability, offered services, vehicle-specific passenger/luggage capacity, service area, languages, and public pricing guidance. No separate tourist-service approval is required.
- Tourist quote handling, booking status and cash-payment recording; administrator listing controls, vehicle association, and destination catalog maintenance.
- Vanuatu-focused localization, fare, and transport UI foundations.

The API also provides the tourist transport request, quote, guest access, driver operations, and administrator endpoints. Tourist bookings are stored separately from account-required passenger bookings so visitors can request a service without registering. Cash collection is recorded by the driver; online payment processing, push notifications, and complete live GPS tracking are not implemented as production services.

The tourist feature requires the `20261019010000_tourist_transport`, `20261020000000_tourist_service_details`, and `20261020100000_driver_managed_tourist_services` Prisma migrations. Apply them using the migration commands below before running the API. Tourist request references and private access codes are issued once at creation; keep both private to retrieve the guest request and quotes later. Admins verify driver registration; they do not approve tourist-service listings or bookings.

## Requirements

- Node.js supported by the installed Expo/NestJS versions
- Yarn
- Docker Desktop (for the local PostgreSQL/PostGIS service)
- Android Studio and Android SDK for local Android builds
- macOS with Xcode for local iOS builds

## Local development

Install mobile dependencies from the project root:

```bash
yarn install
```

Start the local database:

```bash
docker compose up -d postgres
```

Create the API environment file by copying `server/.env.example` to `server/.env`, then set a private `JWT_SECRET` of at least 32 characters. For a local run, the example database URL points to the Docker database. Configure the admin seed values with a unique password of at least 12 characters and a phone number used for the administrator account.

Install backend dependencies, generate Prisma Client, and apply local migrations:

```bash
yarn --cwd server install
yarn db:generate
yarn db:migrate
```

Create/update the initial administrator:

```bash
yarn --cwd server seed:admin
```

Run the API and app in separate terminals:

```bash
yarn server
```

```bash
yarn mobile
```

The API health check is `http://localhost:3000/api/v1/health`.

### Connect a device

Set `EXPO_PUBLIC_API_URL` in the root `.env` file (copy `.env.example`) to an address reachable from the app:

```text
http://10.0.2.2:3000/api/v1        Android emulator
http://localhost:3000/api/v1       iOS simulator
http://YOUR-LAN-IP:3000/api/v1     Physical Android/iPhone on the same Wi-Fi
```

For a physical device, make the API reachable on the local network and allow port `3000` through Windows Firewall. The app must use the machine's LAN IP, not `localhost`.

## Password recovery SMS gateway

The recovery API sends a one-time six-digit code through the configured gateway. The gateway contract is:

```http
POST <SMS_GATEWAY_URL>
Authorization: Bearer <SMS_GATEWAY_API_KEY>
Content-Type: application/json

{"to":"+678...","message":"Your Vanuatu Smart Transport password reset code is 123456. It expires in 10 minutes."}
```

Configure `SMS_GATEWAY_URL` and `SMS_GATEWAY_API_KEY` in `server/.env`. The code is stored as an HMAC, expires after 10 minutes, and allows at most five verification attempts. Requests are limited to one per minute per account. Production requires an HTTPS gateway. The API returns a neutral message for unknown phone numbers; a gateway delivery failure is reported as an API error.

## Production configuration and security

Never deploy with example values. Configure these server-side environment variables using your deployment platform's secret manager:

- `DATABASE_URL`: production PostgreSQL connection string (with TLS as required by the provider).
- `JWT_SECRET`: cryptographically random secret, minimum 32 characters.
- `CLIENT_ORIGIN`: the exact allowed client origin; wildcard CORS is rejected in production.
- `SMS_GATEWAY_URL` and `SMS_GATEWAY_API_KEY`: HTTPS SMS provider endpoint and private API key.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`: private values used when running the admin seed.

The server validates required production configuration at startup. Admin driver-management endpoints require a signed JWT with the `ADMIN` role. Keep the Docker Compose database credentials strictly local-development-only; change credentials and networking for any hosted deployment.

Access tokens expire after 15 minutes. Refresh tokens last 30 days, are stored server-side only as hashes, and rotate on use. The `20261027000000_refresh_sessions_and_rating_uniqueness` migration adds revocable refresh sessions and enforces one driver rating per booking. Apply all pending migrations before deploying the updated API; existing users will need to sign in again after this migration.

Apply migrations in production with:

```bash
yarn --cwd server prisma:migrate:deploy
```

Do not use `prisma migrate dev` against a production database.

## Validation

Run the mobile TypeScript check:

```bash
npx tsc --noEmit
```

Run backend build and automated tests:

```bash
yarn --cwd server test
```

Run linting for the mobile app (tourist screens are excluded):

```bash
yarn lint
```

The backend test suite covers authorization, password recovery and refresh sessions, booking capacity and cancellation, driver location, ratings, tourist behavior, and production environment validation. A successful build does not replace testing with a running database, SMS gateway, and physical devices.

Build and install Android locally (requires Android Studio/SDK):

```bash
npx expo run:android
```

Build and install iOS locally on macOS (requires Xcode):

```bash
npx expo run:ios
```

Native splash configuration changes require a new native build and installation; Expo Go or an already-installed build may not reflect them.
