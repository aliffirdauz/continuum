import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";

import { authOptions } from "./auth";

describe("Auth.js session boundary", () => {
  it("does not expose the API access token to the browser session", async () => {
    const sessionCallback = authOptions.callbacks?.session;

    if (!sessionCallback) {
      throw new Error("The session callback must be configured");
    }

    const session: Session = {
      expires: "2026-09-27T18:00:00.000Z",
      user: {
        id: "",
        email: "manager@northstar.demo",
        name: "Budi Santoso",
        role: "EMPLOYEE",
      },
    };
    const token: JWT = {
      accessToken: "private-api-token",
      email: "manager@northstar.demo",
      id: "usr_northstar_manager",
      role: "MANAGER",
      sub: "usr_northstar_manager",
    };

    const result = await sessionCallback({ session, token } as never);

    expect(result.user).toMatchObject({
      id: "usr_northstar_manager",
      role: "MANAGER",
    });
    expect(JSON.stringify(result)).not.toContain("private-api-token");
  });
});
