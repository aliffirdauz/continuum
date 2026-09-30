import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileExpertise } from "./profile-expertise";
import type { EmployeeExpertise } from "@/lib/api-types";

const area: EmployeeExpertise = {
  knowledgeArea: {
    id: "ka_line4",
    name: "Line 4",
    businessCriticality: 0.9,
    department: { id: "dep_a", name: "Manufacturing" },
  },
  expertiseScore: 62.3,
  confidence: "MEDIUM",
  evidenceCount: 3,
  lastEvidenceAt: "2026-08-01T00:00:00Z",
};

describe("ProfileExpertise", () => {
  it("shows expertise only in each area context with evidence and criticality", () => {
    const html = renderToStaticMarkup(
      <ProfileExpertise items={[area]} total={1} />,
    );
    expect(html).toContain("Line 4");
    expect(html).toContain("/knowledge/ka_line4");
    expect(html).toContain("62.3");
    expect(html).toContain("Medium confidence");
    expect(html).toContain("3 records");
    expect(html).toContain("90%");
    expect(html).not.toMatch(/rank|risk level/i);
  });
  it("renders an empty coverage explanation", () => {
    expect(
      renderToStaticMarkup(<ProfileExpertise items={[]} total={0} />),
    ).toContain("No expertise evidence yet");
  });
});
