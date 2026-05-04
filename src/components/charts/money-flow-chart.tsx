"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import type { MoneyFlow } from "@/lib/supabase/queries";

type Props = { data: MoneyFlow };

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

interface NodePayload {
  name: string;
  icon?: string;
  color?: string;
  kind: "income" | "pivot" | "expense" | "saved" | "drawn";
  total: number;
}

interface LinkPayload {
  source: number;
  target: number;
  value: number;
}

interface SankeyDataset {
  nodes: NodePayload[];
  links: LinkPayload[];
}

function buildSankey(data: MoneyFlow): SankeyDataset | null {
  const { income, expense, totalIncome, totalExpense } = data;
  if (totalIncome <= 0 && totalExpense <= 0) return null;

  const nodes: NodePayload[] = [];
  const links: LinkPayload[] = [];
  const pivotName = totalIncome > 0 ? "Income" : "Funds";

  // Left: income categories (or a single Drawn node when no income)
  const leftStartIdx = nodes.length;
  if (totalIncome > 0) {
    for (const c of income) {
      nodes.push({
        name: c.name,
        icon: c.icon,
        color: c.color,
        kind: "income",
        total: c.total,
      });
    }
  } else {
    nodes.push({
      name: "Drawn from savings",
      kind: "drawn",
      color: "#94a3b8",
      total: totalExpense,
    });
  }
  const leftEndIdx = nodes.length;

  // Middle pivot.
  const pivotIdx = nodes.length;
  nodes.push({
    name: pivotName,
    kind: "pivot",
    color: "#10b981",
    total: Math.max(totalIncome, totalExpense),
  });

  // Left → pivot.
  for (let i = leftStartIdx; i < leftEndIdx; i++) {
    links.push({ source: i, target: pivotIdx, value: nodes[i].total });
  }

  // Right: expense categories.
  const rightStart = nodes.length;
  for (const c of expense) {
    nodes.push({
      name: c.name,
      icon: c.icon,
      color: c.color,
      kind: "expense",
      total: c.total,
    });
  }
  const rightEnd = nodes.length;
  for (let i = rightStart; i < rightEnd; i++) {
    links.push({ source: pivotIdx, target: i, value: nodes[i].total });
  }

  // Surplus → "Saved" sink, only when there's actual income to draw the
  // contrast against. (If income==0 and expense>0, the drawn-from-savings
  // node already explains the flow; adding a Saved node would be confusing.)
  if (totalIncome > 0 && totalIncome > totalExpense) {
    const savedIdx = nodes.length;
    nodes.push({
      name: "Saved",
      kind: "saved",
      color: "#10b981",
      total: totalIncome - totalExpense,
    });
    links.push({
      source: pivotIdx,
      target: savedIdx,
      value: totalIncome - totalExpense,
    });
  }

  // Sanity-check: every link's value must be > 0 or Sankey throws.
  return { nodes, links: links.filter((l) => l.value > 0) };
}

const NODE_FILL: Record<NodePayload["kind"], string> = {
  income: "var(--positive)",
  expense: "var(--negative)",
  pivot: "var(--primary)",
  saved: "var(--positive)",
  drawn: "var(--muted-foreground)",
};

interface SankeyNodeRenderProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: NodePayload & { value?: number };
  containerWidth?: number;
}

function FlowNode(props: SankeyNodeRenderProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload, containerWidth = 0 } = props;
  if (!payload) return null;
  const fill = NODE_FILL[payload.kind] ?? "var(--foreground)";
  // Anchor labels left/right of the node, clamping to chart bounds.
  const isLeftSide = x < containerWidth / 2;
  const labelX = isLeftSide ? x + width + 8 : x - 8;
  const anchor = isLeftSide ? "start" : "end";
  const label = payload.icon ? `${payload.icon}  ${payload.name}` : payload.name;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 2)}
        fill={fill}
        fillOpacity={0.85}
        rx={2}
      />
      <text
        x={labelX}
        y={y + height / 2}
        textAnchor={anchor}
        dominantBaseline="middle"
        fill="var(--foreground)"
        fontSize={11}
      >
        {label}
      </text>
      {height >= 14 && (
        <text
          x={labelX}
          y={y + height / 2 + 12}
          textAnchor={anchor}
          dominantBaseline="middle"
          fill="var(--muted-foreground)"
          fontSize={9}
        >
          {formatMYR(payload.total)}
        </text>
      )}
    </g>
  );
}

interface SankeyLinkRenderProps {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  index?: number;
}

function FlowLink(props: SankeyLinkRenderProps) {
  const {
    sourceX = 0,
    targetX = 0,
    sourceY = 0,
    targetY = 0,
    sourceControlX = 0,
    targetControlX = 0,
    linkWidth = 0,
  } = props;
  const path = `M${sourceX},${sourceY}
    C${sourceControlX},${sourceY}
     ${targetControlX},${targetY}
     ${targetX},${targetY}`;
  return (
    <path
      d={path}
      fill="none"
      stroke="var(--foreground)"
      strokeOpacity={0.18}
      strokeWidth={Math.max(linkWidth, 1)}
    />
  );
}

interface SankeyTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: {
      payload?: NodePayload & LinkPayload;
      source?: { name?: string };
      target?: { name?: string };
      value?: number;
      // Sankey link payload comes inside payload.payload too:
      sourceLink?: NodePayload;
      targetLink?: NodePayload;
    };
    name?: string;
    value?: number;
  }>;
}

function FlowTooltip({ active, payload }: SankeyTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const inner = item.payload?.payload as
    | (NodePayload & Partial<LinkPayload>)
    | undefined;

  // Recharts Sankey passes link tooltip data with source/target objects on
  // the outer payload — node hovers don't have those.
  const link = item.payload as
    | { source?: { name?: string }; target?: { name?: string }; value?: number }
    | undefined;

  if (link?.source && link?.target) {
    return (
      <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
        <p className="text-muted-foreground">
          {link.source.name} → {link.target.name}
        </p>
        <p className="mt-0.5 font-semibold tabular-nums text-foreground">
          {formatMYR(Number(link.value ?? 0))}
        </p>
      </div>
    );
  }

  if (inner?.name) {
    return (
      <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
        <p className="font-medium text-foreground">{inner.name}</p>
        <p className="mt-0.5 tabular-nums text-muted-foreground">
          {formatMYR(inner.total ?? 0)}
        </p>
      </div>
    );
  }

  return null;
}

export function MoneyFlowChart({ data }: Props) {
  const dataset = useMemo(() => buildSankey(data), [data]);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers className="h-4 w-4 text-primary" aria-hidden />
          Money flow
        </h3>
        <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          This month
        </span>
      </div>

      {dataset === null || dataset.links.length === 0 ? (
        <div className="flex h-[260px] flex-col items-center justify-center rounded-xl bg-surface-muted/40 text-center">
          <Layers
            className="mb-2 h-6 w-6 text-subtle-foreground"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">
            Not enough activity yet to draw a flow.
          </p>
          <p className="mt-1 text-xs text-subtle-foreground">
            Log a few income and expense entries this month and they&apos;ll
            light up here.
          </p>
        </div>
      ) : (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <Sankey
              data={dataset}
              nodePadding={28}
              nodeWidth={10}
              iterations={48}
              margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
              node={<FlowNode />}
              link={<FlowLink />}
            >
              <Tooltip content={<FlowTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
