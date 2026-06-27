# Project Rules — Pre-Commit Risk Checker App

## Tech Stack Rules

1. **Frontend uses TailwindCSS** — Always use Tailwind utility classes for all frontend styling. Do NOT use plain CSS or inline styles unless absolutely necessary. The frontend has Tailwind 3.4 fully configured.

2. **Frontend uses React 19 + Vite 8** — Use modern React patterns (hooks, functional components). No class components.

3. **Backend is pure Node.js/Express** — No Python. No additional frameworks. Stick to the existing Express 4.x patterns.

4. **Database is MongoDB Atlas via Mongoose** — All data models live in `risk-checker-backend/models/`. Follow existing schema conventions (snake_case field names, timestamps).

## Auth Rules

5. **Frontend auth is localStorage-based** — Auth tokens and user info are stored in `localStorage` with keys: `auth_token`, `auth_provider`, `user_verified`, `user_name`, `user_email`, `user_avatar`. Always follow this convention when modifying auth flows.

6. **OAuth state param encodes frontendUrl** — The GitHub/Google OAuth flows encode the frontend URL in the `state` query param so the callback redirect works in both local dev and production. Never remove this pattern.

## Project Structure Rules

7. **API helper** — Frontend always uses `apiUrl()` from `src/lib/api.js` to construct backend URLs. Never hardcode `localhost:5000` in components.

8. **Email service** — All email sending goes through `risk-checker-backend/services/emailService.js`. Do not add new email-sending logic outside this file.

9. **Scanner + Scorer** — Core security logic lives in `risk-checker-backend/engine/scanner.js` and `engine/scorer.js`. These are the heart of the app.

## Code Style Rules

10. **Emoji logging** — Backend console logs use emoji prefixes for clarity: `✅` success, `❌` error, `⚠️` warning, `📥` incoming data, `🚀` startup, `📧` email, `🏓` keep-alive ping. Follow this convention.

11. **Silent error handling for non-critical paths** — Webhook emails, keep-alive pings, and per-user digest errors should fail silently (`.catch(() => {})`) to avoid cascading failures.

12. **Rate limiting** — Auth endpoints have strict rate limiting (10 req/15 min). Any new auth-related routes added to `/api/auth/` should also have `app.use('/api/auth/new-route', authLimiter)` in `server.js`.
