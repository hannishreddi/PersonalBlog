#!/usr/bin/env node
/*
 * Sets a new password for the blog owner's account, for when it's forgotten.
 *
 *   npm run reset-password
 *
 * Run it yourself in an interactive terminal (PowerShell, Windows Terminal,
 * or macOS/Linux shells). The password is typed with echo turned off, sent
 * straight to Supabase, and never printed, logged, or written to disk.
 *
 * It uses NEXT_PUBLIC_SUPABASE_URL and the server-only SUPABASE_SECRET_KEY
 * from .env.local, so it only works on a machine that already holds the
 * project's secrets. Changing the password doesn't end existing sessions.
 */
import { createInterface } from "node:readline";

import { createClient } from "@supabase/supabase-js";

const MIN_PASSWORD_LENGTH = 12;

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

/** Reads one line; with `hidden`, typed characters aren't echoed. */
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
    // The prompt is already written; mute everything typed after it.
    if (hidden) rl._writeToOutput = () => {};
  });
}

if (!process.stdin.isTTY) {
  fail("Run this in an interactive terminal (for example PowerShell), so the password can be typed without echo.");
}

try {
  process.loadEnvFile(".env.local");
} catch {
  fail("Couldn't read .env.local. Run this from the project folder.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey?.startsWith("sb_secret_")) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (sb_secret_…) must be set in .env.local.");
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = (await ask("Owner account email: ")).trim().toLowerCase();
if (!email) fail("No email entered.");

// Single-author blog: the user list is tiny, so the first page is enough.
const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) fail(`Couldn't look up accounts: ${listError.message}`);
const user = list.users.find((candidate) => candidate.email?.toLowerCase() === email);
if (!user) fail(`No account uses ${email}. Check the address you sign in with.`);

const password = await ask(`New password (at least ${MIN_PASSWORD_LENGTH} characters, hidden): `, { hidden: true });
if (password.length < MIN_PASSWORD_LENGTH) fail(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
const confirmation = await ask("Type it again: ", { hidden: true });
if (confirmation !== password) fail("The passwords didn't match. Nothing was changed.");

const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
if (error) fail(`Supabase rejected the change: ${error.message}`);

console.log(`\nDone. Sign in at /admin/login as ${email} with the new password.`);
