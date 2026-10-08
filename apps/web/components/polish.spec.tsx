import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExplainDrawer } from "./explain-drawer";
import { InfoTip } from "./info-tip";
import { RiskMethod, TransferMethod } from "./methodology";
import { PageSkeleton } from "./page-skeleton";
import { COVERAGE_COLOR, TrendChart, riskBands } from "./trend-chart";

const points = [
  { label: "Start", value: 18.3, detail: "Plan created: coverage 18.3" },
  {
    label: "Activity 1",
    value: 23.6,
    detail: "Completed: Shadow: coverage 23.6",
  },
  { label: "Activity 2", value: 76, detail: "Completed: Pair: coverage 76.0" },
];

describe("trend chart", () => {
  it("is a labelled image with a tooltip per point, an end value, and first/last axis labels", () => {
    const html = renderToStaticMarkup(
      <TrendChart
        title="Backup coverage"
        summary="Rose from 18.3 to 76.0."
        points={points}
        color={COVERAGE_COLOR}
        reference={{ value: 70, label: "Target" }}
      />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain(
      'aria-label="Backup coverage. Rose from 18.3 to 76.0."',
    );
    expect(html.match(/<title>/g)).toHaveLength(3);
    expect(html).toContain("Completed: Pair: coverage 76.0");
    expect(html).toContain(">76.0<");
    expect(html).toContain(">Start<");
    expect(html).toContain(">Activity 2<");
    expect(html).not.toContain(">Activity 1<");
    expect(html).toContain(">Target 70<");
    // One measure, one axis: a single line path and ticks 0, 50, 100.
    expect(html.match(/<path /g)).toHaveLength(1);
    expect(html).not.toContain("stroke-dasharray");
  });

  it("labels risk-level bands in text, not color alone", () => {
    const html = renderToStaticMarkup(
      <TrendChart
        title="Area risk score"
        summary="From Critical to Low."
        points={points}
        color="#1d4ed8"
        bands={riskBands}
      />,
    );
    for (const label of ["Critical", "High", "Medium", "Low"])
      expect(html).toContain(`>${label}<`);
  });
});

describe("explanations", () => {
  it("opens definitions from an accessible button and keeps them described", () => {
    const html = renderToStaticMarkup(
      <InfoTip term="effective experts">
        How evenly expertise is spread.
      </InfoTip>,
    );
    expect(html).toContain('aria-label="About effective experts"');
    expect(html).toMatch(
      /aria-describedby="([^"]+)"[^>]*>.*role="tooltip" id="\1" hidden=""/s,
    );
  });

  it("renders a drawer trigger and a labelled dialog with the documented formula", () => {
    const html = renderToStaticMarkup(
      <ExplainDrawer
        triggerLabel="How risk is calculated"
        title="How knowledge risk is calculated"
      >
        <RiskMethod />
        <TransferMethod />
      </ExplainDrawer>,
    );
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toMatch(
      /<dialog aria-labelledby="([^"]+)"[^>]*>.*<h2 id="\1"/s,
    );
    expect(html).toContain("risk-v1");
    expect(html).toContain("transfer-v1");
    expect(html).toContain('aria-label="Close explanation"');
    expect(html).not.toMatch(/performance|rank/i);
  });

  it("announces route skeletons as loading status", () => {
    const html = renderToStaticMarkup(
      <PageSkeleton
        stats={4}
        panels={["pair", "chart", "list"]}
        label="Loading the plan"
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading the plan");
  });
});
