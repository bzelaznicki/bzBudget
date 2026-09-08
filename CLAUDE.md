# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
pnpm dev          # Start dev server with Turbopack
pnpm build        # Production build
pnpm lint         # Run ESLint (next/core-web-vitals, next/typescript)
pnpm fmt          # Format code with Prettier
pnpm seed         # Seed database with initial data
```

### Database Migrations

```bash
pnpm drizzle-kit generate   # Generate migration from schema changes
pnpm drizzle-kit migrate    # Apply pending migrations
pnpm drizzle-kit push       # Push schema directly (dev only)
```

## Architecture Overview

**bzBudget** is a full-stack budget tracking application built with:
- **Next.js 16** (App Router) + React 19 + TypeScript (strict mode)
- **Drizzle ORM** with PostgreSQL
- **Better Auth** for email/password authentication
- **Shadcn UI** components with Tailwind CSS

### Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (authenticated)/      # Protected routes (dashboard, settings, transactions)
│   ├── api/                  # REST endpoints (accounts, transactions, currencies)
│   ├── login/                # Login and password reset
│   └── register/             # User registration
├── db/
│   ├── schema.ts             # Drizzle table definitions
│   ├── db.ts                 # Database client
│   └── queries/              # Centralized query functions
├── lib/
│   ├── auth.ts               # Better Auth server config
│   ├── auth-client.ts        # Client-side auth hooks
│   └── validation/           # Zod schemas for request validation
├── components/
│   └── ui/                   # Shadcn UI components
└── util/
    └── json.ts               # Response helpers (respondWithJSON, respondWithError)
```

### Key Patterns

- **Authentication**: API routes validate sessions via `auth.api.getSession()` from `@/lib/auth`
- **Database queries**: Centralized in `src/db/queries/` - use these instead of direct Drizzle calls
- **Validation**: Zod schemas in `src/lib/validation/` define API request shapes
- **Path aliases**: Use `@/*` to import from `src/*`

### Database Schema

Main tables in `src/db/schema.ts`:
- `users` - User accounts with default currency preference
- `bankAccounts` - User's financial accounts
- `transactions` - Money movements (incoming/outgoing types)
- `categories` - System and user-defined transaction categories
- `currencies` - Supported currencies with symbol positioning

## Code Style

- **Tabs** for indentation, **100 char** line width
- ESLint extends `next/core-web-vitals` and `next/typescript`
