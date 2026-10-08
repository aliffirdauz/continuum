import { beforeEach, expect, it, vi } from "vitest";

const { apiPost, apiPatch, requireSession, redirect, revalidatePath } =
  vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    apiPost: vi.fn(),
    apiPatch: vi.fn(),
    requireSession: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`REDIRECT ${path}`);
    }),
  }));
vi.mock("@/lib/api", () => ({
  apiPost,
  apiPatch,
  ApiRequestError: class ApiRequestError extends Error {
    constructor(readonly status: number) {
      super(String(status));
    }
  },
}));
vi.mock("@/lib/session", () => ({ requireSession }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect,
}));
import { ApiRequestError } from "@/lib/api";
import {
  addTransferActivity,
  completeTransferActivity,
  createTransfer,
  updateTransferStatus,
} from "./actions";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const plan = {
  knowledgeAreaId: "ka_line4_troubleshooting",
  primaryHolderId: "emp_budi",
  backupEmployeeId: "emp_andri",
  targetCoverage: "70",
  targetDate: "2026-12-31",
};

beforeEach(() => {
  vi.resetAllMocks();
  requireSession.mockResolvedValue({ user: { role: "MANAGER" } });
});

it("creates a plan with numeric target and redirects to it", async () => {
  apiPost.mockResolvedValue({ data: { id: "plan_1" } });
  await expect(createTransfer({ error: "" }, form(plan))).rejects.toThrow(
    "REDIRECT /transfers/plan_1",
  );
  expect(apiPost).toHaveBeenCalledWith("/transfers", {
    ...plan,
    targetCoverage: 70,
  });
});

it.each([
  [{ backupEmployeeId: "" }, /primary holder and a backup/],
  [{ backupEmployeeId: "emp_budi" }, /different people/],
  [{ targetCoverage: "0" }, /1 to 100/],
  [{ targetCoverage: "70.5" }, /1 to 100/],
  [{ targetDate: "31/12/2026" }, /target date/],
])("rejects %o without calling the API", async (change, message) => {
  expect(
    await createTransfer({ error: "" }, form({ ...plan, ...change })),
  ).toEqual({
    error: expect.stringMatching(message),
  });
  expect(apiPost).not.toHaveBeenCalled();
});

it("maps API failures to safe messages and lets session redirects escape", async () => {
  apiPost.mockRejectedValueOnce(new ApiRequestError(409));
  expect((await createTransfer({ error: "" }, form(plan))).error).toMatch(
    /conflicts/,
  );
  apiPost.mockRejectedValueOnce(new ApiRequestError(400));
  expect((await createTransfer({ error: "" }, form(plan))).error).toMatch(
    /above the backup's current coverage/,
  );
  apiPost.mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.1"));
  expect((await createTransfer({ error: "" }, form(plan))).error).toBe(
    "Could not save the change. Please try again.",
  );
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  apiPost.mockImplementationOnce(() =>
    actual.redirect("/sign-in?reason=expired"),
  );
  await expect(createTransfer({ error: "" }, form(plan))).rejects.toThrow(
    "NEXT_REDIRECT",
  );
});

it("keeps employees from writing", async () => {
  requireSession.mockResolvedValue({ user: { role: "EMPLOYEE" } });
  for (const result of [
    await createTransfer({ error: "" }, form(plan)),
    await updateTransferStatus(
      "plan_1",
      { error: "" },
      form({ status: "BLOCKED" }),
    ),
    await addTransferActivity(
      "plan_1",
      { error: "" },
      form({ type: "TRAINING", title: "Course" }),
    ),
    await completeTransferActivity("plan_1", "act_1"),
  ])
    expect(result.error).toMatch(/permission/);
  expect(apiPost).not.toHaveBeenCalled();
  expect(apiPatch).not.toHaveBeenCalled();
});

it("validates status, activity, and weight before writing", async () => {
  expect(
    await updateTransferStatus(
      "plan_1",
      { error: "" },
      form({ status: "DONE" }),
    ),
  ).toEqual({ error: "Choose a valid status." });
  for (const values of [
    { type: "NOPE", title: "Course", weight: "1" },
    { type: "TRAINING", title: "x", weight: "1" },
    { type: "TRAINING", title: "Course", weight: "0" },
    { type: "TRAINING", title: "Course", weight: "1.5" },
  ])
    expect(
      (await addTransferActivity("plan_1", { error: "" }, form(values))).error,
    ).not.toBe("");
  expect(apiPost).not.toHaveBeenCalled();
  expect(await completeTransferActivity("plan_1", "bad id")).toEqual({
    error: "Choose a valid activity.",
  });
});

it("sends status changes, activities, and completions, then refreshes the plan in place", async () => {
  const saved = { error: "", savedAt: expect.any(Number) as number };
  expect(
    await updateTransferStatus(
      "plan_1",
      { error: "" },
      form({ status: "BLOCKED" }),
    ),
  ).toEqual(saved);
  expect(revalidatePath).toHaveBeenCalledWith("/transfers/plan_1");
  expect(revalidatePath).toHaveBeenCalledWith("/transfers");
  expect(redirect).not.toHaveBeenCalled();
  expect(apiPatch).toHaveBeenCalledWith("/transfers/plan_1", {
    status: "BLOCKED",
  });
  expect(
    await addTransferActivity(
      "plan_1",
      { error: "" },
      form({
        type: "PAIR_WORK",
        title: "  Pair on a line restart  ",
        weight: "0.8",
      }),
    ),
  ).toEqual(saved);
  expect(apiPost).toHaveBeenCalledWith("/transfers/plan_1/activities", {
    type: "PAIR_WORK",
    title: "Pair on a line restart",
    weight: 0.8,
  });
  expect(await completeTransferActivity("plan_1", "act_1")).toEqual(saved);
  expect(apiPatch).toHaveBeenCalledWith("/transfers/plan_1/activities/act_1", {
    status: "COMPLETED",
  });
  apiPatch.mockRejectedValueOnce(new ApiRequestError(409));
  expect((await completeTransferActivity("plan_1", "act_1")).error).toMatch(
    /conflicts/,
  );
});
