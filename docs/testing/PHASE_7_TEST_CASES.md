# Phase 7: Product Polish Acceptance

Status: **In progress — automated and agent-assisted acceptance passed on 2026-10-08; acceptance-owner screenshot sign-off pending**. Scope lives in [`../DEVELOPMENT_PHASES.md`](../DEVELOPMENT_PHASES.md). No formula, version, or write endpoint changed.

## Cases

- TC-P7-001: The dashboard shows critical and at-risk area counts, average effective experts, and active transfer plans (from `GET /dashboard/transfer-summary`, counts by status, readable by every authenticated role). The highest-risk list names each area's primary holder: the largest unrounded contribution, with an ID tie-break, or "no recorded holder". `GET /knowledge/:id/risk` is unchanged.
- TC-P7-002: Transfer detail shows backup coverage and area risk score as two single-measure charts, never a dual axis, once at least two checkpoints exist. Knowledge detail charts captured risk only with at least two real snapshots. Each chart is a labelled image with a per-point tooltip, an end value, text-labelled risk bands, and a table or list carrying the same values.
- TC-P7-003: Explanation drawers on the dashboard, knowledge detail, simulation result, and transfer detail open from the keyboard, move focus to the close button, close with Escape, return focus to the trigger, and restate the documented formulas and versions.
- TC-P7-004: Definitions for effective experts, the risk score, the coverage proxy, and backup coverage open on hover or focus, are announced through `aria-describedby`, close with Escape, and never cause horizontal overflow at 375 pixels.
- TC-P7-005: The dashboard, knowledge detail, simulation result, transfer list, and transfer detail each have a page-shaped loading skeleton announced as a status.
- TC-P7-006: At 375 pixels, every primary page shows its heading without horizontal overflow, including with a definition or drawer open.
- TC-P7-007: The README covers the problem, product hypothesis, a Mermaid architecture diagram, the main technical concepts, the demo walkthrough with the reset workflow, and screenshots. `docs/ARCHITECTURE.md` carries the same diagram.
- TC-P7-008: The opt-in portfolio demo runs the spec section 49 path end to end and leaves the database at the seed state. The path covers:
  1. the dashboard and the Line 4 risk, explanation drawer, and evidence;
  2. the Expert Finder;
  3. a simulation of Budi, then planning a transfer from its result;
  4. the Andri plan (CRITICAL → HIGH), then the Joko plan (→ LOW), and the dashboard again.
- TC-P7-009: Format, lint, typecheck, unit tests, builds, API integration, Playwright, and a client bundle token scan pass on a rebuilt Compose stack, and the owner reviews the screenshots.

## Results

### 2026-10-08: rebuilt Compose stack (Docker Engine 28.4.0, Chromium)

- `npx --yes pnpm@10.17.1 format:check` and `npx --yes pnpm@10.17.1 check`: passed. API unit **201/201**, adding the primary holder (tie-break, `null`, unchanged area response) and the status summary. Web unit **75/75**, adding the chart, tooltip, drawer, skeleton, and dashboard additions. Both production builds passed.
- `npx --yes pnpm@10.17.1 test:integration`: **81/81** on two consecutive runs. New: Line 4's primary holder is Budi at `asOf=2026-09-01`, and the summary's status counts add up to the list total, with `active` = planned + in progress + blocked.
- `npx --yes pnpm@10.17.1 test:e2e`: **21 passed, 5 skipped** (opt-in walkthroughs and the demo) on two consecutive runs. `e2e/polish.spec.ts` covers:
  - keyboard drawer open, focus, Escape, and focus return;
  - the knowledge-detail drawer;
  - tooltip on focus and Escape at 375 pixels with no overflow, and an open drawer with no overflow;
  - a 375-pixel sweep of nine primary pages.
- `RUN_PORTFOLIO_DEMO=1 WALKTHROUGH_OUTPUT_DIR="$(cygpath -m "$PWD/docs/screenshots")" npx --yes pnpm@10.17.1 --filter @continuum/web exec playwright test portfolio-demo.manual.spec.ts --workers=1`: **1/1** with no page errors. It produced the [nine README screenshots](../screenshots/), and the database afterwards held 186 evidence records and 0 plans. The Phase 6 walkthrough was rerun on the final image (**1/1**) to refresh its screenshots with the charts.
- Client bundle scan: none of the 20 built chunks contains `accessToken`, `Bearer `, or secret names.

Defects found and fixed during acceptance:

1. **Tooltips widened the page on phones.** An open definition added 83 pixels of horizontal overflow at 375 pixels, because the tooltip extended past the viewport; the new polish E2E caught it. Tooltips now dock to the bottom of narrow screens and open toward the side with room on wider ones.
2. **Chart labels collided.** The coverage target label collided with the end value, and the first point covered a risk band label. The target is now labelled on the left, and banded charts leave a label gutter.

Visual review by the agent:

- [Dashboard before](../screenshots/01-dashboard.png) and [after](../screenshots/09-dashboard-after.png): critical areas fell from 6 to 5 and Line 4 left the critical list; active plans read 0 → 1, with 1 completed; primary holders are linked.
- [Drawer](../screenshots/03-explanation-drawer.png): a right-hand panel over a dimmed page.
- [Transfer progress](../screenshots/07-transfer-progress.png): two single-axis charts with labelled bands and a target. [Mobile](../screenshots/08-transfer-mobile.png): stacked cards.
- The full-page sidebar and skip-link placement is the known Playwright capture artifact from earlier phases.

Environment note: during one rebuild, C: free space dropped briefly to 387 MB. The space was not consumed by Docker; the VHDX size was unchanged. The build watchdog cancelled the build before the engine was at risk, and a retry completed with at least 6.2 GB free.

Acceptance-owner screenshot review is **pending**.
