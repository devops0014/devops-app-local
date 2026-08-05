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
import { performanceData, radarData } from "@/lib/data";

const tooltipStyle = {
  background: "#151517",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: "12px",
  color: "#fafafa",
  fontSize: "11px",
  boxShadow: "0 20px 60px rgba(0,0,0,.35)",
};

export function PerformanceLineChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={performanceData} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} />
        <YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,.08)" }} />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="url(#lineGradient)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#111113", stroke: "#a78bfa", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AccuracyAreaChart() {
  const data = [
    { week: "W1", accuracy: 48 },
    { week: "W2", accuracy: 56 },
    { week: "W3", accuracy: 53 },
    { week: "W4", accuracy: 64 },
    { week: "W5", accuracy: 68 },
    { week: "W6", accuracy: 72 },
    { week: "W7", accuracy: 78 },
    { week: "W8", accuracy: 84 },
  ];
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
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} />
        <YAxis domain={[30, 100]} axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="accuracy" stroke="#a78bfa" strokeWidth={2.5} fill="url(#areaFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MasteryRadarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={radarData} outerRadius="73%">
        <PolarGrid stroke="rgba(255,255,255,.08)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: "#71717a", fontSize: 10 }} />
        <Radar dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.24} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart() {
  const data = [
    { month: "Feb", revenue: 328000 },
    { month: "Mar", revenue: 396000 },
    { month: "Apr", revenue: 458000 },
    { month: "May", revenue: 521000 },
    { month: "Jun", revenue: 612000 },
    { month: "Jul", revenue: 748000 },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#52525b", fontSize: 10 }}
          tickFormatter={(value) => `₹${value / 1000}k`}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2.5} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
