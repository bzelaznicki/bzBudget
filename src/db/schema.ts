import { sql } from "drizzle-orm";
import {
	boolean,
	index,
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
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		emailUnique: uniqueIndex("users_email_unique").on(table.email),
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
});

export const categories = pgTable("categories", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	type: categoriesTypeEnum("type").notNull().default("system"),
	usersId: uuid("users_id").references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

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
