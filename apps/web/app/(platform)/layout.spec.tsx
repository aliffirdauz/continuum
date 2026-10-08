import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/session", () => ({
  requireSession: vi
    .fn()
    .mockResolvedValue({ user: { name: "Manager", role: "MANAGER" } }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
import PlatformLayout from "./layout";

it("links desktop and mobile navigation to the simulation and transfer flows", async () => {
  const html = renderToStaticMarkup(
    await PlatformLayout({ children: <p>Content</p> }),
  );
  expect(html.match(/href="\/simulate"/g)).toHaveLength(2);
  expect(html).not.toContain("Simulation</span><span");
  expect(html.match(/href="\/transfers"/g)).toHaveLength(2);
  expect(html).not.toContain("Transfers</span><span");
});
