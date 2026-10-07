import { beforeEach, expect, it, vi } from "vitest";

const { apiPost, requireSession, redirect } = vi.hoisted(() => ({
  apiPost: vi.fn(),
  requireSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));
vi.mock("@/lib/api", () => ({
  apiPost,
  ApiRequestError: class ApiRequestError extends Error {
    constructor(readonly status: number) {
      super(String(status));
    }
  },
}));
vi.mock("@/lib/session", () => ({ requireSession }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect,
}));
import { createSimulation } from "./actions";

beforeEach(() => {
  vi.resetAllMocks();
  requireSession.mockResolvedValue({ user: { role: "MANAGER" } });
});

it("submits validated employee and duration then redirects to saved result", async () => {
  apiPost.mockResolvedValue({ data: { id: "sim_123" } });
  const form = new FormData();
  form.set("employeeId", "emp_budi");
  form.set("durationDays", "30");
  await expect(createSimulation({ error: "" }, form)).rejects.toThrow(
    "REDIRECT /simulate/sim_123",
  );
  expect(apiPost).toHaveBeenCalledWith("/simulations/unavailability", {
    employeeId: "emp_budi",
    durationDays: 30,
  });
});

it.each(["0", "366", "1.5", "hello", ""])(
  "rejects an invalid duration %s without writing",
  async (duration) => {
    const form = new FormData();
    form.set("employeeId", "emp_budi");
    form.set("durationDays", duration);
    expect(await createSimulation({ error: "" }, form)).toEqual({
      error: expect.stringMatching(/1 to 365/),
    });
    expect(apiPost).not.toHaveBeenCalled();
  },
);

it("rejects a missing employee without writing", async () => {
  const form = new FormData();
  form.set("durationDays", "30");
  expect(await createSimulation({ error: "" }, form)).toEqual({
    error: expect.stringMatching(/employee/i),
  });
  expect(apiPost).not.toHaveBeenCalled();
});

it("does not let a viewer create a run", async () => {
  requireSession.mockResolvedValue({ user: { role: "VIEWER" } });
  const form = new FormData();
  form.set("employeeId", "emp_budi");
  form.set("durationDays", "30");
  expect(await createSimulation({ error: "" }, form)).toEqual({
    error: expect.stringMatching(/permission/i),
  });
  expect(apiPost).not.toHaveBeenCalled();
});

it("lets an expired-token redirect escape instead of reporting a save failure", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  apiPost.mockImplementation(() => actual.redirect("/sign-in?reason=expired"));
  const form = new FormData();
  form.set("employeeId", "emp_budi");
  form.set("durationDays", "30");
  await expect(createSimulation({ error: "" }, form)).rejects.toThrow(
    "NEXT_REDIRECT",
  );
});

it("returns a safe error when the API rejects an invalid employee", async () => {
  apiPost.mockRejectedValue(new Error("internal database connection failed"));
  const form = new FormData();
  form.set("employeeId", "emp_missing");
  form.set("durationDays", "30");
  expect(await createSimulation({ error: "" }, form)).toEqual({
    error: expect.stringMatching(/could not/i),
  });
});
