"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "#151517",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: "12px",
  color: "#fafafa",
  fontSize: "11px",
  boxShadow: "0 20px 60px rgba(0,0,0,.35)",
};

function ChartEmpty({ message }: { message: string }) {
  return <div className="grid h-full place-items-center rounded-xl border border-dashed border-white/[.08] p-6 text-center text-sm text-zinc-500">{message}</div>;
}

export function PerformanceLineChart({ data }: { data: { day: string; accuracy: number | null }[] }) {
  if (!data.some((point) => point.accuracy !== null)) return <ChartEmpty message="Take a quiz this week to see your daily accuracy." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,.08)" }} />
        <Line
          type="monotone"
          dataKey="accuracy"
          connectNulls
          stroke="url(#lineGradient)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#111113", stroke: "#a78bfa", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AccuracyAreaChart({ data }: { data: { week: string; accuracy: number | null }[] }) {
  if (!data.some((point) => point.accuracy !== null)) return <ChartEmpty message="Your accuracy trend appears after your first quiz." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="accuracy" connectNulls stroke="#a78bfa" strokeWidth={2.5} fill="url(#areaFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MasteryRadarChart({ data }: { data: { category: string; score: number }[] }) {
  if (data.length < 3) return <ChartEmpty message="Practise at least three topics to see your strengths." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="73%">
        <PolarGrid stroke="rgba(255,255,255,.08)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: "#71717a", fontSize: 11 }} />
        <Radar dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.24} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
