import { describe, expect, it, vi } from "vitest";

import { requireSession } from "./session";

const { getServerSession, redirect } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));

describe("requireSession", () => {
  it("redirects an anonymous request to sign-in", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?callbackUrl=/dashboard",
    );
  });

  it("returns the session of an authenticated request", async () => {
    const session = {
      expires: "2026-09-27T18:00:00.000Z",
      user: { id: "usr_northstar_manager", role: "MANAGER" },
    };
    getServerSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
  });
});
