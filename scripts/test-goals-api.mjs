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
const name = `goals_api_test_${randomUUID().replaceAll("-", "")}`;
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
	const input = { name: "Emergency fund", targetAmount: "1000.50", currenciesId: currency.id };
	for (const [method, path] of [
		["GET", "/api/goals"],
		["POST", "/api/goals"],
		["GET", `/api/goals/${randomUUID()}`],
		["PATCH", `/api/goals/${randomUUID()}`],
		["DELETE", `/api/goals/${randomUUID()}`],
	]) {
		assert.equal((await request(path, { method, cookie: "" })).status, 401);
	}
	assert.equal((await request("/goals", { cookie: "" })).status, 307);
	assert.deepEqual(await (await request("/api/goals")).json(), []);
	assert.equal((await request("/api/goals", { method: "POST", rawBody: "{" })).status, 400);
	for (const body of [
		{ ...input, targetAmount: "Infinity" },
		{ ...input, usersId: other.id },
		{ ...input, currenciesId: randomUUID() },
		{ ...input, dueDate: "2026-02-30" },
	]) {
		assert.equal((await request("/api/goals", { method: "POST", body })).status, 400);
	}
	const created = await request("/api/goals", { method: "POST", body: input });
	assert.equal(created.status, 201);
	const goal = await created.json();
	assert.equal(goal.usersId, owner.id);
	assert.equal(goal.targetAmount, "1000.50");
	assert.equal(goal.currentAmount, "0.00");
	const path = `/api/goals/${goal.id}`;
	assert.equal((await request(path)).status, 200);
	for (const method of ["GET", "PATCH", "DELETE"]) {
		assert.equal(
			(
				await request(path, {
					method,
					cookie: otherCookie,
					...(method === "PATCH" ? { body: { currentAmount: "999.00" } } : {}),
				})
			).status,
			404,
		);
	}
	assert.deepEqual(await (await request("/api/goals", { cookie: otherCookie })).json(), []);
	assert.equal((await request("/api/goals/not-a-uuid")).status, 400);
	assert.equal((await request("/api/goals?status=invalid")).status, 400);
	assert.equal((await request(path, { method: "PATCH", body: {} })).status, 400);
	assert.equal(
		(await request(path, { method: "PATCH", body: { currentAmount: "-1" } })).status,
		400,
	);
	const changed = await request(path, {
		method: "PATCH",
		body: {
			currentAmount: "1250.25",
			status: "completed",
			dueDate: "2028-02-29",
			description: "Ready",
		},
	});
	assert.equal(changed.status, 200);
	assert.equal((await changed.json()).currentAmount, "1250.25");
	assert.equal((await (await request("/api/goals?status=completed")).json()).length, 1);
	assert.deepEqual(await (await request("/api/goals?status=active")).json(), []);
	const page = await request("/goals");
	assert.equal(page.status, 200);
	const html = await page.text();
	assert.ok(html.includes("Emergency fund"));
	assert.ok(html.includes("PLN"));
	assert.equal((await request(path, { method: "PATCH", body: { dueDate: null } })).status, 200);
	assert.equal((await request(path, { method: "DELETE" })).status, 204);
	assert.equal((await request(path)).status, 404);
	assert.equal((await request(path, { method: "PATCH", body: { name: "Revived" } })).status, 404);
	assert.equal((await request(path, { method: "DELETE" })).status, 404);
	assert.deepEqual(await (await request("/api/goals")).json(), []);
	console.log(
		"Goals HTTP authentication, ownership, validation, CRUD, filters, and rendered page pass.",
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
