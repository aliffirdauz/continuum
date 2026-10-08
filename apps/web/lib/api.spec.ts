import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError, apiGet, apiPatch, apiPost, buildApiUrl } from "./api";

const { getToken, notFound, redirect } = vi.hoisted(() => ({
  getToken: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/jwt", () => ({ getToken }));
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({ toString: () => "next-auth.session-token=encrypted" }),
}));
vi.mock("next/navigation", () => ({ notFound, redirect }));

describe("apiGet", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    getToken.mockResolvedValue({ accessToken: "private-api-token" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the server-side access token and returns the parsed body", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: [] }));

    await expect(
      apiGet("/knowledge", { search: "line 4", departmentId: undefined }),
    ).resolves.toEqual({ data: [] });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3001/api/v1/knowledge?search=line+4");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer private-api-token",
    });
    expect(init.cache).toBe("no-store");
  });

  it("sends a request without a session to sign-in without calling the API", async () => {
    getToken.mockResolvedValue(null);

    await expect(apiGet("/knowledge")).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?callbackUrl=/dashboard",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the user to sign in again when the API rejects the token", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(apiGet("/knowledge")).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?reason=expired",
    );
  });

  it("renders the not-found boundary for unknown records", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(apiGet("/knowledge/ka_missing")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("raises a status-only error for other failures", async () => {
    fetchMock.mockResolvedValue(
      new Response("database password leaked here", { status: 500 }),
    );

    const error = await apiGet("/knowledge").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).status).toBe(500);
    expect((error as Error).message).not.toContain("password");
  });
});

describe("apiPost", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    getToken.mockResolvedValue({ accessToken: "private-api-token" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("posts JSON using the server-only token and returns the saved run", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: { id: "sim_1" } }));
    await expect(
      apiPost("/simulations/unavailability", {
        employeeId: "emp_budi",
        durationDays: 30,
      }),
    ).resolves.toEqual({ data: { id: "sim_1" } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3001/api/v1/simulations/unavailability");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer private-api-token",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(init.body as string)).toEqual({
      employeeId: "emp_budi",
      durationDays: 30,
    });
  });

  it("does not send a POST without a token", async () => {
    getToken.mockResolvedValue(null);
    await expect(
      apiPost("/simulations/unavailability", {
        employeeId: "emp_budi",
        durationDays: 30,
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends PATCH with the same token handling and surfaces API errors", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: { id: "plan_1" } }));
    await expect(
      apiPatch("/transfers/plan_1", { status: "BLOCKED" }),
    ).resolves.toEqual({ data: { id: "plan_1" } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init).toMatchObject({
      method: "PATCH",
      headers: { Authorization: "Bearer private-api-token" },
    });
    fetchMock.mockResolvedValue(new Response("{}", { status: 409 }));
    await expect(
      apiPatch("/transfers/plan_1", { status: "BLOCKED" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("buildApiUrl", () => {
  it("omits empty query values", () => {
    expect(
      buildApiUrl("/employees", {
        search: "",
        page: 2,
        departmentId: undefined,
      }),
    ).toBe("http://localhost:3001/api/v1/employees?page=2");
  });
});
