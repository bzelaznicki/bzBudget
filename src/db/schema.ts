import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const categoriesTypeEnum = pgEnum("categories_type", ["system", "user"]);

export const currenciesPositionEnum = pgEnum("currenciesPosition", ["before", "after"]);

export const transactionsTypeEnum = pgEnum("transaction_type", ["incoming", "outgoing"]);

export const budgetPeriodEnum = pgEnum("budget_period", ["weekly", "monthly", "yearly"]);

export const budgetAlertTypeEnum = pgEnum("budget_alert_type", ["threshold", "exceeded"]);

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name"),
		email: text("email").notNull(),
		emailVerified: boolean("email_verified").notNull().default(false),
		image: text("image"),
		defaultCurrenciesId: uuid("default_currencies_id").references(() => currencies.id, {
			onDelete: "restrict",
		}),
		// Uses JavaScript/ISO weekday mapping (0=Sunday, 6=Saturday)
		weekStartDay: integer("week_start_day").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		emailUnique: uniqueIndex("users_email_unique").on(table.email),
		weekStartDayCheck: check(
			"users_week_start_day_check",
			sql`${table.weekStartDay} BETWEEN 0 AND 6`,
		),
	}),
);

export const currencies = pgTable("currencies", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull().unique(),
	isoCode: text("iso_code").notNull().unique(),
	symbol: text("symbol").notNull(),
	position: currenciesPositionEnum("position").default("after"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("users_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }), //adapted for Better Auth
		providerId: text("provider_id").notNull(),
		accountId: text("account_id").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		scope: text("scope"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			withTimezone: true,
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			withTimezone: true,
		}),
		password: text("password"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		providerAccountUnique: uniqueIndex("accounts_provider_account_unique").on(
			table.providerId,
			table.accountId,
		),
		userIdIdx: index("accounts_users_id_idx").on(table.userId),
	}),
);

export const bankAccounts = pgTable("bank_accounts", {
	id: uuid("id").primaryKey().defaultRandom(),
	usersId: uuid("users_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	iban: text("iban"),
	currenciesId: uuid("currencies_id")
		.notNull()
		.references(() => currencies.id),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		type: categoriesTypeEnum("type").notNull().default("system"),
		usersId: uuid("users_id").references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		nameUsersUnique: uniqueIndex("categories_name_users_id_unique").on(table.name, table.usersId),
	}),
);

export const transactions = pgTable(
	"transactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		usersId: uuid("users_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accountsId: uuid("accounts_id")
			.notNull()
			.references(() => bankAccounts.id, { onDelete: "cascade" }),
		amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
		description: text("description"),
		counterparty: text("counterparty").notNull(),
		currenciesId: uuid("currencies_id").references(() => currencies.id),
		categoriesId: uuid("categories_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		externalId: text("external_id"),
		bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
		type: transactionsTypeEnum("type").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		usersExternalUnique: uniqueIndex("transactions_users_external_unique").on(
			table.usersId,
			table.externalId,
		),
		bookedAtIdx: index("transactions_booked_at_idx").on(table.bookedAt),
	}),
);

export const sessions = pgTable(
	"sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("users_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }), //adapted for Better Auth
		token: text("token").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		tokenUnique: uniqueIndex("sessions_token_unique").on(table.token),
		expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
		userIdIdx: index("sessions_users_id_idx").on(table.userId),
	}),
);

export const verifications = pgTable(
	"verifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		identifierIdx: index("verifications_identifier_idx").on(table.identifier),
		expiresAtIdx: index("verifications_expires_at_idx").on(table.expiresAt),
	}),
);

export const budgets = pgTable(
	"budgets",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		usersId: uuid("users_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		categoriesId: uuid("categories_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
		period: budgetPeriodEnum("period").notNull(),
		alertThreshold: integer("alert_threshold").default(80).notNull(),
		emailAlerts: boolean("email_alerts").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(table) => ({
		usersCategoriesPeriodUnique: uniqueIndex("budgets_users_categories_period_unique").on(
			table.usersId,
			sql`COALESCE(${table.categoriesId}, ${sql.raw("'00000000-0000-0000-0000-000000000000'::uuid")})`,
			table.period,
		),
		usersIdIdx: index("budgets_users_id_idx").on(table.usersId),
	}),
);

export const budgetAlerts = pgTable(
	"budget_alerts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		budgetsId: uuid("budgets_id")
			.notNull()
			.references(() => budgets.id, { onDelete: "cascade" }),
		usersId: uuid("users_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		alertType: budgetAlertTypeEnum("alert_type").notNull(),
		sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
		spendingAtAlert: numeric("spending_at_alert", { precision: 12, scale: 2 }).notNull(),
	},
	(table) => ({
		budgetsIdIdx: index("budget_alerts_budgets_id_idx").on(table.budgetsId),
		usersIdIdx: index("budget_alerts_users_id_idx").on(table.usersId),
	}),
);
