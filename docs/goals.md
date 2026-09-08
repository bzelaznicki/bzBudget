# Savings goals

Goals track savings manually. A user creates a named goal, selects its currency,
sets a positive target amount, and enters the total saved so far. The saved amount
may exceed the target. An optional target date and notes provide context.

The user chooses the status: active, completed, paused, or missed. Neither reaching
the target nor passing the target date changes that status automatically. An active
goal with a target date before today shows "Past target date", using the UTC date.
Transactions do not update goals. Recurring spending limits remain in budgets.

The `/goals` page is available from the sidebar. It lists the current user's goals,
filters by status, and supports creation, editing, progress updates, and deletion
with confirmation. Loading, empty, validation, and request failure states are shown
in the page or dialog. Changing currency requires the user to enter amounts in that
currency; there is no automatic conversion. Each card displays its own currency.

## API

All routes require a session. Users can only read, change, or delete their own goals.
An unknown, deleted, or another user's goal returns 404. Invalid input returns 400.

| Method | Route            | Behavior                                                      |
| ------ | ---------------- | ------------------------------------------------------------- |
| GET    | `/api/goals`     | List undeleted goals, newest first. Optional `status` filter. |
| POST   | `/api/goals`     | Create a goal and return it with status 201.                  |
| GET    | `/api/goals/:id` | Return one goal.                                              |
| PATCH  | `/api/goals/:id` | Update one or more fields and return the goal.                |
| DELETE | `/api/goals/:id` | Soft-delete the goal and return 204.                          |

Creation requires `name`, `targetAmount`, and `currenciesId`. Optional fields are
`currentAmount`, `status`, `dueDate`, and `description`. Defaults are `"0.00"`,
`"active"`, `null`, and `null`, respectively. Dates are valid `YYYY-MM-DD` strings.
Money is a decimal string with at most ten integer digits and two fractional digits.
The target must be positive; saved progress must be nonnegative. Responses normalize
amounts to two fractional digits. Unknown fields and empty updates are rejected.

Deletion hides the goal and prevents further API updates. It does not alter accounts
or transactions. There is no restore UI. The database retains the deleted record
until its owning user is deleted.

## Migration and verification

`0001_savings_goals.sql` adds the goals table, status enum, ownership index, currency
and user foreign keys, and amount constraints. It does not change existing tables
or data. Use the existing `pnpm migrate` command.

`TEST_DATABASE_URL` must point to a PostgreSQL server on which the test user can
create disposable databases. These commands create and remove their own databases:

```sh
node scripts/test-migrations.mjs
pnpm build
node scripts/test-goals-api.mjs
```

The migration suite includes `scripts/test-goals.ts` for validation and database
behavior. The HTTP suite starts the production build with real persisted sessions
and verifies authentication, ownership, CRUD, filters, and server-rendered content.
Both suites run in CI.

This replaces the unfinished `user_goals` prototype with manual savings goals.
Its proposed spending goals and recurring periods are not part of this feature.
