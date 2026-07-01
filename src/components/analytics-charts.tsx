"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";

interface MonthlySales {
  name: string;
  total: number;
}

interface SourceBreakdown {
  name: string;
  count: number;
  revenue: number;
  color: string;
}

interface AnalyticsChartsProps {
  salesData: MonthlySales[];
  sourceData: SourceBreakdown[];
}

export default function AnalyticsCharts({ salesData, sourceData }: AnalyticsChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Revenue Trend Area Chart */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-white font-sans">Monthly Revenue Growth</h4>
          <p className="text-xs text-slate-400">Chronological trend of gross revenue earned this calendar year</p>
        </div>
        <div className="h-80 w-full flex items-center justify-center bg-slate-950/20 rounded-xl overflow-hidden">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(value) => [`$${value}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="total" stroke="#a78bfa" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGradient)" />
            </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-500 animate-pulse">Loading chart...</div>
          )}
        </div>
      </div>

      {/* Grid for channel breakdowns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Distribution */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-white">Channel Market Share</h4>
            <p className="text-xs text-slate-400">Order count distribution by channel</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-56 w-56 flex items-center justify-center bg-slate-950/20 rounded-full overflow-hidden">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    formatter={(value) => [value, "Orders"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-500 animate-pulse">Loading...</div>
            )}
          </div>
          <div className="flex-1 space-y-3 w-full sm:w-auto">
            {sourceData.map((src, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: src.color }} />
                  <span className="font-semibold text-slate-300">{src.name}</span>
                </div>
                <span className="font-bold text-white">{src.count} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue contribution by Channel */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-white">Channel Revenue Contribution</h4>
          <p className="text-xs text-slate-400">Total revenue generated per channel</p>
        </div>
        <div className="h-64 w-full flex items-center justify-center bg-slate-950/20 rounded-xl overflow-hidden">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  formatter={(value) => [`$${value}`, "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-500 animate-pulse">Loading chart...</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
