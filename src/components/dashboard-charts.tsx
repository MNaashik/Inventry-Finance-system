"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";

interface SalesData {
  name: string;
  total: number;
}

interface SourceData {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  salesData: SalesData[];
  sourceData: SourceData[];
}

export default function DashboardCharts({ salesData, sourceData }: DashboardChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Monthly Sales Chart */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-white">Monthly Sales Revenue</h4>
          <p className="text-xs text-slate-400">Total revenue generated per month</p>
        </div>
        <div className="h-80 w-full flex items-center justify-center bg-slate-950/20 rounded-xl overflow-hidden">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
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
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {salesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#primaryGradient)" />
                ))}
              </Bar>
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-500 animate-pulse">Loading chart...</div>
          )}
        </div>
      </div>

      {/* Order Source Breakdown Chart */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl">
        <div className="mb-4">
          <h4 className="text-base font-semibold text-white">Order Source Distribution</h4>
          <p className="text-xs text-slate-400">Channels customers order from</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-64 w-64 flex items-center justify-center bg-slate-950/20 rounded-full overflow-hidden">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
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
        <div className="flex-1 w-full sm:w-auto space-y-3.5">
            {sourceData.map((source, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="font-medium text-slate-300">{source.name}</span>
                </div>
                <span className="font-bold text-white">{source.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
