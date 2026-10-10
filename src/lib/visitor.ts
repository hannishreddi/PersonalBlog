import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

/*
 * Privacy-conscious reader identity for reactions and rate limits.
 *
 * - A visitor who likes a post gets an HttpOnly cookie holding a random id.
 *   Visitors who never react get no cookie. The id itself is never stored:
 *   the database only sees HMAC(ENGAGEMENT_HASH_SECRET, id), so a database
 *   leak cannot be linked back to a browser without the server secret.
 * - Rate limits use HMAC(secret, client IP). The IP is never stored or
 *   logged; the digest lives in private.rate_limits for at most two days.
 * - Nothing here is taken from form fields: the browser cannot choose its
 *   own hash.
 */

const VISITOR_COOKIE = "reader_id";
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hashSecret(): string | null {
  const secret = process.env.ENGAGEMENT_HASH_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/** True when the hashing secret is configured (at least 32 characters). */
export function isVisitorHashingConfigured(): boolean {
  return hashSecret() !== null;
}

function digest(purpose: string, value: string): string {
  const secret = hashSecret();
  if (!secret) throw new Error("ENGAGEMENT_HASH_SECRET is missing or shorter than 32 characters.");
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest("hex");
}

/** The current visitor's reactor hash, or null if they have no valid cookie. */
export async function getReactorHash(): Promise<string | null> {
  const id = (await cookies()).get(VISITOR_COOKIE)?.value;
  return id && VISITOR_ID_PATTERN.test(id) ? digest("reactor", id) : null;
}

/**
 * The visitor's reactor hash, issuing a new cookie if needed. Only callable
 * where cookies can be set (Server Actions and Route Handlers).
 */
export async function getOrCreateReactorHash(): Promise<string> {
  const store = await cookies();
  let id = store.get(VISITOR_COOKIE)?.value;
  if (!id || !VISITOR_ID_PATTERN.test(id)) {
    id = randomBytes(32).toString("base64url");
    store.set(VISITOR_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    });
  }
  return digest("reactor", id);
}

/**
 * HMAC of the client IP for rate limiting. Relies on the hosting platform
 * setting x-real-ip / x-forwarded-for; behind a proxy that passes these
 * through from the client unchanged, they can be spoofed (see README).
 * Requests without either header share one "unknown" bucket.
 */
export async function getClientHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return digest("client", ip.slice(0, 64));
}
