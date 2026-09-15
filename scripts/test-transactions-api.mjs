import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";
import postgres from "postgres";
import { runMigrations } from "./migrate.mjs";

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
const admin = postgres(process.env.TEST_DATABASE_URL, { max: 1 });
const name = `transactions_api_test_${randomUUID().replaceAll("-", "")}`;
const secret = randomUUID() + randomUUID();
let client;
let server;
let serverClosed;
let output = "";
try {
	await admin.unsafe(`CREATE DATABASE "${name}"`);
	const url = new URL(process.env.TEST_DATABASE_URL);
	url.pathname = `/${name}`;
	client = postgres(url.toString(), { max: 1, onnotice: () => {} });
	await runMigrations(client);
	const [currency] =
		await client`INSERT INTO currencies (name, iso_code, symbol) VALUES ('Polish zloty', 'PLN', 'zł') RETURNING id`;
	const [owner, other] =
		await client`INSERT INTO users (email, name, email_verified, default_currencies_id)
		VALUES ('goals-owner@example.invalid', 'Goals owner', true, ${currency.id}),
		('goals-other@example.invalid', 'Goals other', true, ${currency.id}) RETURNING id`;
	// Use real persisted sessions and the installed Better Auth HMAC cookie format.
	async function sessionCookie(userId) {
		const token = randomUUID();
		await client`INSERT INTO sessions (users_id, token, expires_at) VALUES (${userId}, ${token}, now() + interval '1 hour')`;
		const signature = createHmac("sha256", secret).update(token).digest("base64");
		return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
	}
	const ownerCookie = await sessionCookie(owner.id);
	const otherCookie = await sessionCookie(other.id);
	const portServer = createServer().listen(0, "127.0.0.1");
	await once(portServer, "listening");
	const port = portServer.address().port;
	await new Promise((resolve) => portServer.close(resolve));
	const base = `http://127.0.0.1:${port}`;
	server = spawn(
		process.execPath,
		["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
		{
			env: {
				...process.env,
				DATABASE_URL: url.toString(),
				BETTER_AUTH_SECRET: secret,
				BETTER_AUTH_URL: base,
				INBOUND_API_KEY: "ci-test-only",
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	serverClosed = once(server, "close");
	server.stdout.on("data", (data) => {
		output = (output + data).slice(-12000);
	});
	server.stderr.on("data", (data) => {
		output = (output + data).slice(-12000);
	});
	for (let attempt = 0; ; attempt++) {
		if (server.exitCode !== null) throw new Error(`Test server exited: ${output}`);
		try {
			if ((await fetch(`${base}/api/health`)).ok) break;
		} catch {}
		if (attempt >= 60) throw new Error(`Test server did not start: ${output}`);
		await setTimeout(500);
	}
	async function request(path, { method = "GET", cookie = ownerCookie, body, rawBody } = {}) {
		return fetch(`${base}${path}`, {
			method,
			headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
			...(rawBody !== undefined
				? { body: rawBody }
				: body !== undefined
					? { body: JSON.stringify(body) }
					: {}),
			redirect: "manual",
		});
	}
	const [account, otherAccount] =
		await client`INSERT INTO bank_accounts (users_id, name, currencies_id)
		VALUES (${owner.id}, 'Checking', ${currency.id}), (${other.id}, 'Private', ${currency.id}) RETURNING id`;
	const [category] =
		await client`INSERT INTO categories (name, users_id, type) VALUES ('Groceries', ${owner.id}, 'user') RETURNING id`;
	for (let i = 0; i < 25; i++) {
		await client`INSERT INTO transactions (users_id, accounts_id, amount, counterparty, currencies_id, booked_at, type)
		VALUES (${owner.id}, ${account.id}, 10, 'Recent', ${currency.id}, '2026-09-10T12:00:00Z', 'outgoing')`;
	}
	const [match] =
		await client`INSERT INTO transactions (users_id, accounts_id, amount, counterparty, description, categories_id, currencies_id, booked_at, type)
		VALUES (${owner.id}, ${account.id}, 42.15, 'Old merchant 100%_saved', 'Unique note', ${category.id}, ${currency.id}, '2026-08-01T23:59:59.999999Z', 'outgoing') RETURNING id`;
	await client`INSERT INTO transactions (users_id, accounts_id, amount, counterparty, currencies_id, booked_at, type)
		VALUES (${other.id}, ${otherAccount.id}, 42.15, 'Old merchant', ${currency.id}, '2026-08-01T12:00:00Z', 'outgoing')`;
	await client`INSERT INTO transactions (users_id, accounts_id, amount, counterparty, currencies_id, booked_at, type, deleted_at)
		VALUES (${owner.id}, ${account.id}, 42.15, 'Old merchant', ${currency.id}, '2026-08-01T12:00:00Z', 'outgoing', now())`;
	async function list(query = "", cookie = ownerCookie) {
		const response = await request(`/api/transactions?${query}`, { cookie });
		assert.equal(response.status, 200);
		return response.json();
	}
	assert.equal((await request("/api/transactions", { cookie: null })).status, 401);
	const first = await list();
	assert.equal(first.total, 26);
	assert.equal(first.pages, 2);
	assert.equal(first.transactions.length, 20);
	assert.ok(!first.transactions.some((row) => row.id === match.id));
	const second = await list("page=2");
	assert.equal(second.transactions.length, 6);
	assert.equal(
		new Set([...first.transactions, ...second.transactions].map((row) => row.id)).size,
		26,
	);
	for (const search of ["OLD MERCHANT", "unique note", "42.15", "Groceries", "%_", "100%_saved"]) {
		const result = await list(new URLSearchParams({ search }).toString());
		assert.equal(result.total, 1, search);
		assert.equal(result.pages, 1);
		assert.deepEqual(
			result.transactions.map((row) => row.id),
			[match.id],
		);
	}
	for (const query of [
		`categoryId=${category.id}`,
		"dateFrom=2026-08-01&dateTo=2026-08-01",
		`search=old&accountId=${account.id}&categoryId=${category.id}&dateFrom=2026-08-01&dateTo=2026-08-01`,
	])
		assert.deepEqual(
			(await list(query)).transactions.map((row) => row.id),
			[match.id],
		);
	for (const query of [
		"search=absent",
		`accountId=${otherAccount.id}`,
		"dateTo=2026-07-31",
		`categoryId=${randomUUID()}`,
	]) {
		const result = await list(query);
		assert.equal(result.total, 0);
		assert.equal(result.pages, 0);
		assert.equal((result.transactions ?? []).length, 0);
	}
	assert.equal((await list(`categoryId=${category.id}`, otherCookie)).total, 0);
	assert.equal((await list("search=old", otherCookie)).total, 1);
	for (const query of [
		"dateFrom=2026-02-30",
		"dateTo=0000-01-01",
		"dateFrom=2026-09-10&dateTo=2026-08-01",
		"accountId=bad",
		"categoryId=bad",
		"page=1abc",
		"page=-1",
		"perPage=101",
		"search=" + "x".repeat(201),
	]) {
		assert.equal((await request(`/api/transactions?${query}`)).status, 400, query);
	}
	const page = await request(`/transactions?search=old&categoryId=${category.id}`);
	assert.equal(page.status, 200);
	assert.ok((await page.text()).includes("Groceries"));

	// Detail sheet edits.
	const patchPath = `/api/transactions/${match.id}`;
	const patched = await request(patchPath, {
		method: "PATCH",
		body: { counterparty: "Renamed", description: null, categoriesId: null, recurring: true },
	});
	assert.equal(patched.status, 200);
	const patchedBody = await patched.json();
	assert.equal(patchedBody.counterparty, "Renamed");
	assert.equal(patchedBody.description, null);
	assert.equal(patchedBody.categoriesId, null);
	assert.equal(patchedBody.recurring, true);
	const [foreignCategory] =
		await client`INSERT INTO categories (name, users_id, type) VALUES ('Private', ${other.id}, 'user') RETURNING id`;
	for (const [body, status, cookie] of [
		[{ counterparty: "Stolen" }, 404, otherCookie],
		[{}, 400],
		[{ amount: 1 }, 400],
		[{ counterparty: "   " }, 400],
		[{ categoriesId: foreignCategory.id }, 400],
	]) {
		assert.equal(
			(await request(patchPath, { method: "PATCH", body, cookie })).status,
			status,
			JSON.stringify(body),
		);
	}
	assert.equal(
		(await request("/api/transactions/bad", { method: "PATCH", body: { recurring: true } })).status,
		404,
	);
	assert.equal(
		(await client`SELECT counterparty FROM transactions WHERE id = ${match.id}`)[0].counterparty,
		"Renamed",
	);
	const created = await request("/api/transactions", {
		method: "POST",
		body: {
			accountsId: account.id,
			amount: 5,
			counterparty: "Gym",
			currenciesId: currency.id,
			type: "outgoing",
			bookedAt: new Date().toISOString(),
			recurring: true,
		},
	});
	assert.equal(created.status, 201);
	assert.equal((await created.json()).recurring, true);

	// Transfers move balances without counting as spending.
	const [euro] =
		await client`INSERT INTO currencies (name, iso_code, symbol) VALUES ('Euro', 'EUR', '€') RETURNING id`;
	const [savings, euroAccount] =
		await client`INSERT INTO bank_accounts (users_id, name, currencies_id)
		VALUES (${owner.id}, 'Savings', ${currency.id}), (${owner.id}, 'Euro wallet', ${euro.id}) RETURNING id`;
	await client`INSERT INTO budgets (users_id, amount, period) VALUES (${owner.id}, 100000, 'monthly')`;
	const spending = async () => (await (await request("/api/budgets")).json())[0].currentSpending;
	const spentBefore = await spending();
	const transferPayload = { fromAccountId: account.id, toAccountId: savings.id, amount: 400 };
	assert.equal(
		(await request("/api/transfers", { method: "POST", body: transferPayload, cookie: null }))
			.status,
		401,
	);
	for (const body of [
		{ ...transferPayload, toAccountId: account.id },
		{ ...transferPayload, toAccountId: euroAccount.id },
		{ ...transferPayload, toAccountId: otherAccount.id },
		{ ...transferPayload, amount: -1 },
		{ ...transferPayload, fromAccountId: "bad" },
	]) {
		assert.equal(
			(await request("/api/transfers", { method: "POST", body })).status,
			400,
			JSON.stringify(body),
		);
	}
	const transferResponse = await request("/api/transfers", {
		method: "POST",
		body: transferPayload,
	});
	assert.equal(transferResponse.status, 201);
	const transfer = await transferResponse.json();
	assert.equal(transfer.from.transferId, transfer.to.transferId);
	assert.equal(transfer.from.type, "outgoing");
	assert.equal(transfer.to.type, "incoming");
	assert.equal(transfer.from.accountsId, account.id);
	assert.equal(transfer.to.accountsId, savings.id);
	assert.equal(await spending(), spentBefore, "Transfers stay out of budgets");
	const legPath = `/api/transactions/${transfer.from.id}`;
	assert.equal(
		(await request(legPath, { method: "PATCH", body: { categoriesId: category.id } })).status,
		400,
	);
	assert.equal(
		(await request(legPath, { method: "PATCH", body: { description: "Rainy day" } })).status,
		200,
	);
	const legs =
		await client`SELECT description, deleted_at FROM transactions WHERE transfer_id = ${transfer.transferId}`;
	assert.deepEqual(
		legs.map((leg) => leg.description),
		["Rainy day", "Rainy day"],
	);
	assert.equal((await request(legPath, { method: "DELETE", cookie: otherCookie })).status, 404);
	assert.equal((await request(legPath, { method: "DELETE" })).status, 204);
	const deletedLegs =
		await client`SELECT deleted_at FROM transactions WHERE transfer_id = ${transfer.transferId}`;
	assert.ok(
		deletedLegs.every((leg) => leg.deleted_at !== null),
		"Deleting one leg removes both",
	);

	console.log(
		"Transaction HTTP search, combined filters, date boundaries, pagination, validation, user isolation, edits, and transfers pass.",
	);
} catch (error) {
	console.error(output);
	throw error;
} finally {
	if (server && server.exitCode === null) {
		server.kill("SIGTERM");
		const force = globalThis.setTimeout(() => server.kill("SIGKILL"), 5000);
		await serverClosed;
		clearTimeout(force);
	}
	if (client) await client.end();
	await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
	await admin.end();
}
