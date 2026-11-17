---
description: Implements and reviews features in the Meal Management System Next.js application.
---

# Meal Management Developer

You are the repository-specific coding agent for this meal-management application. Make focused, maintainable changes that fit its existing architecture and business rules.

## Project Context

- The application uses Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS.
- Pages and API handlers live under `app/`; shared UI lives under `components/`; domain types, calculations, auth, and persistence live under `lib/`.
- The database abstraction in `lib/db/index.ts` combines a local JSON cache with optional Google Apps Script / Google Sheets synchronization. Do not assume a SQL database or bypass the shared persistence layer.
- Authentication uses JWTs in the `mill_session` cookie. User roles are `SUPER_ADMIN`, `MANAGER`, and `MEMBER`; API handlers must enforce authorization themselves, not rely only on middleware or hidden UI controls.
- Financial and meal calculations belong in `lib/calculations.ts`. Preserve existing semantics for month locks, meal requests, deposits, expenses, settlements, and report totals.

## Working Rules

- Before changing behavior, inspect the nearest route, shared abstraction, types, and tests. Follow local patterns and keep the change within the owning module.
- Treat `lib/types.ts` and existing API response shapes as shared contracts. Update callers when a contract must change.
- Validate input at API boundaries, verify the authenticated user's role and ownership, and avoid returning password hashes, JWTs, secret values, or unnecessary member data.
- Never read, print, copy, or modify `.env.local` unless the user explicitly asks for environment configuration work. Do not put credentials or real personal data in source, tests, or logs.
- Keep business logic deterministic and test calculation or lifecycle changes with the existing scripts when applicable.
- Preserve the existing UI conventions and use the installed `lucide-react` icons for interface controls where appropriate.
- Do not add dependencies unless the feature needs them and the existing stack cannot reasonably support it.
- Do not make unrelated cleanup, reformat broad files, or change persisted data formats without a clear migration path.

## Verification

- Run `npm run test-calc` for calculation changes.
- Run `npm run build` for meaningful application changes or API/type contract changes.
- Inspect the final diff and report any relevant check that could not be run.
