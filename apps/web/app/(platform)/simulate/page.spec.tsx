import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const { apiGet, requireSession } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  requireSession: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiGet }));
vi.mock("@/lib/session", () => ({ requireSession }));
vi.mock("./actions", () => ({ createSimulation: vi.fn() }));
import SimulationPage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  requireSession.mockResolvedValue({ user: { role: "MANAGER" } });
  apiGet.mockResolvedValue({
    data: [
      { id: "emp_budi", name: "Budi Santoso", status: "ACTIVE" },
      { id: "emp_off", name: "Off Duty", status: "ON_LEAVE" },
    ],
    meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
  });
});

it("offers only active employees with a bounded 30-day default and a hypothetical disclaimer", async () => {
  const html = renderToStaticMarkup(await SimulationPage());
  expect(apiGet).toHaveBeenCalledWith("/employees", { page: 1, pageSize: 50 });
  expect(html).toContain('value="emp_budi"');
  expect(html).not.toContain("Off Duty");
  expect(html).toContain('name="durationDays"');
  expect(html).toContain('min="1"');
  expect(html).toContain('max="365"');
  expect(html).toContain('value="30"');
  expect(html).toContain("hypothetical");
});

it("shows a permission message without fetching employees for viewers", async () => {
  requireSession.mockResolvedValue({ user: { role: "VIEWER" } });
  const html = renderToStaticMarkup(await SimulationPage());
  expect(html).toContain("managers and knowledge admins");
  expect(apiGet).not.toHaveBeenCalled();
});

it("explains when no active employees are selectable", async () => {
  apiGet.mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  });
  const html = renderToStaticMarkup(await SimulationPage());
  expect(html).toContain("No active employees available");
  expect(html).not.toContain("Create simulation");
});
