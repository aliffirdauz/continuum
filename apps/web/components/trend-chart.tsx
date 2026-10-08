/**
 * A single-series 0–100 trend as server-rendered SVG. One measure per chart:
 * different measures get separate charts, never a second axis. Every point has
 * a native tooltip, and pages keep a table or list with the same values.
 */
export interface TrendPoint {
  /** Short x-axis label, shown for the first and last point only. */
  label: string;
  value: number;
  /** Full description for the point's tooltip. */
  detail: string;
}

export interface TrendBand {
  from: number;
  to: number;
  label: string;
  fill: string;
}

interface TrendChartProps {
  title: string;
  /** Plain-language summary; the figure's text alternative. */
  summary: string;
  points: TrendPoint[];
  color: string;
  reference?: { value: number; label: string };
  bands?: TrendBand[];
}

const WIDTH = 360;
const HEIGHT = 180;
const PAD = { top: 14, right: 44, bottom: 26, left: 30 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const INK = "#0f172a";
const MUTED = "#64748b";
const GRID = "#e2e8f0";

const y = (value: number) =>
  PAD.top + PLOT_H - (Math.min(100, Math.max(0, value)) / 100) * PLOT_H;

export function TrendChart({
  title,
  summary,
  points,
  color,
  reference,
  bands = [],
}: TrendChartProps) {
  // Leave a gutter for band labels so the first point never covers them.
  const inset = bands.length ? 44 : 8;
  const span = PLOT_W - inset - 8;
  const x = (index: number) =>
    PAD.left +
    inset +
    (points.length === 1 ? span / 2 : (index / (points.length - 1)) * span);
  const path = points
    .map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`)
    .join(" ");
  const last = points.at(-1);

  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="text-sm font-semibold text-slate-900">
        {title}
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title}. ${summary}`}
        className="h-auto w-full max-w-xl"
      >
        {bands.map((band) => (
          <g key={band.label}>
            <rect
              x={PAD.left}
              y={y(band.to)}
              width={PLOT_W}
              height={y(band.from) - y(band.to)}
              fill={band.fill}
            />
            <text
              x={PAD.left + 4}
              y={y(band.to) + 11}
              fontSize="9"
              fill={MUTED}
            >
              {band.label}
            </text>
          </g>
        ))}
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(tick)}
              y2={y(tick)}
              stroke={GRID}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(tick) + 3.5}
              fontSize="10"
              textAnchor="end"
              fill={MUTED}
            >
              {tick}
            </text>
          </g>
        ))}
        {reference ? (
          <g>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke={MUTED}
              strokeWidth="1"
            />
            {/* Labelled at the left so it never collides with the end value. */}
            <text
              x={PAD.left + 4}
              y={y(reference.value) - 4}
              fontSize="10"
              fill={MUTED}
            >
              {reference.label} {reference.value}
            </text>
          </g>
        ) : null}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <g key={index}>
            <title>{point.detail}</title>
            {/* A larger transparent target than the visible marker. */}
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r="10"
              fill="transparent"
            />
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r="4"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        ))}
        {last ? (
          <text
            x={x(points.length - 1) + 8}
            y={y(last.value) + 4}
            fontSize="11"
            fontWeight="600"
            fill={INK}
          >
            {last.value.toFixed(1)}
          </text>
        ) : null}
        {points.length > 1 ? (
          <>
            <text x={x(0)} y={HEIGHT - 8} fontSize="10" fill={MUTED}>
              {points[0]!.label}
            </text>
            <text
              x={x(points.length - 1)}
              y={HEIGHT - 8}
              fontSize="10"
              textAnchor="end"
              fill={MUTED}
            >
              {last!.label}
            </text>
          </>
        ) : null}
      </svg>
    </figure>
  );
}

/** Phase 4 `risk-v1` level boundaries, as tinted bands with text labels. */
export const riskBands: TrendBand[] = [
  { from: 45, to: 100, label: "Critical", fill: "#fff1f2" },
  { from: 30, to: 45, label: "High", fill: "#fff7ed" },
  { from: 10, to: 30, label: "Medium", fill: "#fffbeb" },
  { from: 0, to: 10, label: "Low", fill: "#ecfdf5" },
];

export const COVERAGE_COLOR = "#047857";
export const RISK_COLOR = "#1d4ed8";
