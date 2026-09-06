"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { HourlyHeatFlowPoint } from "@/lib/api/heat-flow";

interface HeatFlowChartProps {
  hourlyData: HourlyHeatFlowPoint[];
  selectedHour: number;
  onSelectHour: (hour: number) => void;
}

export function HeatFlowChart({
  hourlyData,
  selectedHour,
  onSelectHour,
}: HeatFlowChartProps) {
  const chartData = hourlyData.map((d) => ({
    hour: d.hour,
    hourLabel: `${d.hour < 10 ? `0${d.hour}` : d.hour}:00`,
    ambientTemp: d.ambient_temp_c,
    indoorTemp: d.indoor_temp_c,
    qTotal: d.q_total_w,
    qWalls: d.q_walls_w,
    qGlazing: d.q_glazing_w,
    qRoof: d.q_roof_w,
    qFloor: d.q_floor_w,
    ghi: d.ghi_w_m2,
    deltaT: d.delta_t_k,
  }));

  // Find min/max for temperature scale
  const allTemps = chartData.flatMap((d) => [d.ambientTemp, d.indoorTemp]);
  const minTemp = Math.floor(Math.min(...allTemps) - 2);
  const maxTemp = Math.ceil(Math.max(...allTemps) + 4);

  return (
    <div className="rounded-none border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            24-Hour Diurnal Heat Flux &amp; Temperature Profile
          </h3>
          <p className="text-xs text-muted-foreground">
            Click any hour to scrub the 3D visual and sun position
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Current: <strong className="text-accent">{selectedHour < 10 ? `0${selectedHour}` : selectedHour}:00</strong>
        </span>
      </div>

      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(state: unknown) => {
              const s = state as { activePayload?: Array<{ payload?: { hour?: number } }> } | null;
              if (s && s.activePayload && s.activePayload.length > 0) {
                const hour = s.activePayload[0]?.payload?.hour;
                if (typeof hour === "number") {
                  onSelectHour(hour);
                }
              }
            }}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="qLossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A63D2F" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#A63D2F" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#D9D0BF" opacity={0.7} />

            <XAxis
              dataKey="hourLabel"
              stroke="#685E55"
              fontSize={11}
              tickLine={false}
              interval={2}
            />

            {/* Left Axis: Temperature (°C) */}
            <YAxis
              yAxisId="temp"
              domain={[minTemp, maxTemp]}
              stroke="#685E55"
              fontSize={11}
              tickLine={false}
              unit="°C"
            />

            {/* Right Axis: Heat Loss Rate (Watts) */}
            <YAxis
              yAxisId="heat"
              orientation="right"
              stroke="#A63D2F"
              fontSize={11}
              tickLine={false}
              unit="W"
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-none border border-border bg-card p-3 text-xs shadow-md">
                      <p className="border-b border-border pb-1 font-mono font-bold text-foreground">
                        {data.hourLabel} IST · ΔT: {data.deltaT} K
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-[#B65C38] font-medium">
                          Indoor Temp: <strong>{data.indoorTemp}°C</strong>
                        </p>
                        <p className="text-[#4A6D88] font-medium">
                          Ambient Temp: <strong>{data.ambientTemp}°C</strong>
                        </p>
                        <p className="text-[#B87326] font-medium">
                          Solar GHI: <strong>{data.ghi} W/m²</strong>
                        </p>
                        <div className="mt-1 border-t border-border pt-1 text-[#A63D2F]">
                          <p>
                            Total Heat Loss: <strong>{data.qTotal.toLocaleString()} W</strong>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Walls: {data.qWalls}W · Roof: {data.qRoof}W · Glaze: {data.qGlazing}W · Floor: {data.qFloor}W
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: "11px" }}
            />

            {/* Vertical cursor line synchronized to selected hour */}
            <ReferenceLine
              yAxisId="temp"
              x={`${selectedHour < 10 ? `0${selectedHour}` : selectedHour}:00`}
              stroke="#4A6D88"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: "Current",
                position: "top",
                fill: "#4A6D88",
                fontSize: 10,
              }}
            />

            {/* Heat Loss Area */}
            <Area
              yAxisId="heat"
              type="monotone"
              dataKey="qTotal"
              name="Heat Loss (W)"
              stroke="#A63D2F"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#qLossGradient)"
            />

            {/* Indoor Temperature Line */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="indoorTemp"
              name="Indoor Temp (°C)"
              stroke="#B65C38"
              strokeWidth={2.5}
              dot={false}
            />

            {/* Ambient Temperature Line */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="ambientTemp"
              name="Ambient Temp (°C)"
              stroke="#4A6D88"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
