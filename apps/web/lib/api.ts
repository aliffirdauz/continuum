import "server-only";

import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { SIGN_IN_PATH } from "./session";

export const SESSION_EXPIRED_PATH = "/sign-in?reason=expired";

export type QueryValue = string | number | undefined;

export class ApiRequestError extends Error {
  constructor(readonly status: number) {
    super(`The Continuum API responded with status ${status}`);
    this.name = "ApiRequestError";
  }
}

function apiBaseUrl(): string {
  return process.env.INTERNAL_API_URL ?? "http://localhost:3001/api/v1";
}

export function buildApiUrl(
  path: string,
  query: Record<string, QueryValue> = {},
): string {
  const url = new URL(`${apiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

// The API token lives only in the encrypted Auth.js cookie, never in the browser-visible session.
async function readAccessToken(): Promise<string | undefined> {
  const cookieHeader = (await cookies()).toString();
  const token = await getToken({
    req: new NextRequest(process.env.NEXTAUTH_URL ?? "http://localhost:3000", {
      headers: { cookie: cookieHeader },
    }),
  });

  return token?.accessToken;
}

/**
 * Performs an authenticated GET from a server component. A missing session
 * redirects to sign-in, a rejected token asks the user to sign in again, and
 * an unknown record renders the nearest not-found boundary.
 */
export async function apiGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<T> {
  const accessToken = await readAccessToken();

  if (!accessToken) {
    redirect(SIGN_IN_PATH);
  }

  const response = await fetch(buildApiUrl(path, query), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  if (response.status === 401) {
    redirect(SESSION_EXPIRED_PATH);
  }

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status);
  }

  return (await response.json()) as T;
}
