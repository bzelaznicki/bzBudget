import { numeric, pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";


export const users = pgTable('users', {
	id: uuid("id").primaryKey().defaultRandom(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text("email").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const currenciesPositionEnum = pgEnum('currenciesPosition', ['before', 'after']);

export const currencies = pgTable('currencies', {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	isoCode: text("iso_code").notNull(),
	symbol: text("symbol").notNull(),
	position: currenciesPositionEnum("position").default('after'),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable('accounts', {
	id: uuid("id").primaryKey().defaultRandom(),
	usersId: uuid("users_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	iban: text("iban"),
	currencyId: uuid("currencies_id").notNull().references(() => currencies.id),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const transactionsTypeEnum = pgEnum('transaction_type', ['incoming', 'outgoing']);

export const transactions = pgTable('transactions', {
	id: uuid("id").primaryKey().defaultRandom(),
	usersId: uuid("users_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	accountsId: uuid("accounts_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
	description: text(),
	counterparty: text("counterparty").notNull(),
	currenciesId: uuid("currencies_id").references(() => currencies.id),
	categoriesId: uuid("categories_id").references(() => categories.id, { onDelete: "set null" }),
	externalId: text("external_id"),
	bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
	type: transactionsTypeEnum("type").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const categoriesTypeEnum = pgEnum('categories_type', ['system', 'user']);

export const categories = pgTable('categories', {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	type: categoriesTypeEnum("type").notNull().default("system"),
	usersId: uuid("users_id").references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
