"use client";

import React, { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Sun, Moon, Sunrise, Sunset, Flame, ShieldAlert } from "lucide-react";
import { HourlyHeatFlowPoint } from "@/lib/api/heat-flow";

interface TimeScrubberProps {
  selectedHour: number;
  onSelectHour: (hour: number) => void;
  currentPoint: HourlyHeatFlowPoint;
}

export function TimeScrubber({
  selectedHour,
  onSelectHour,
  currentPoint,
}: TimeScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onSelectHour((selectedHour + 1) % 24);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, selectedHour, onSelectHour]);

  const getTimeLabel = (h: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    if (h === 6) return "06:00 (Dawn)";
    if (h === 12) return "12:00 (Solar Noon)";
    if (h === 18) return "18:00 (Sunset)";
    if (h === 0) return "00:00 (Midnight)";
    return `${pad(h)}:00 IST`;
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* ── Top Bar: Time Readout & Play Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            id="btn-play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              isPlaying
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                : "border-border bg-muted text-foreground hover:bg-muted/80"
            }`}
            title={isPlaying ? "Pause 24-hour simulation" : "Play 24-hour solar simulation"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button
            id="btn-reset-time"
            onClick={() => {
              setIsPlaying(false);
              onSelectHour(12);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            title="Reset to Solar Noon (12:00)"
          >
            <RotateCcw size={15} />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold text-foreground">
                {getTimeLabel(selectedHour)}
              </span>
              {currentPoint.is_sun_up ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                  <Sun size={11} /> Day
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                  <Moon size={11} /> Night
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sun Alt: {currentPoint.sun_elevation_deg}° · Azimuth: {currentPoint.sun_azimuth_deg}°
            </p>
          </div>
        </div>

        {/* Quick jump anchor buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/50 p-1">
          <button
            id="btn-time-midnight"
            onClick={() => onSelectHour(0)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              selectedHour === 0 ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Moon size={12} />
            <span>00:00</span>
          </button>
          <button
            id="btn-time-dawn"
            onClick={() => onSelectHour(6)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              selectedHour === 6 ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sunrise size={12} />
            <span>06:00</span>
          </button>
          <button
            id="btn-time-noon"
            onClick={() => onSelectHour(12)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              selectedHour === 12 ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sun size={12} />
            <span>12:00</span>
          </button>
          <button
            id="btn-time-sunset"
            onClick={() => onSelectHour(18)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              selectedHour === 18 ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sunset size={12} />
            <span>18:00</span>
          </button>
        </div>
      </div>

      {/* ── 0-23 Hour Slider ── */}
      <div className="space-y-1.5">
        <input
          id="heat-flow-time-slider"
          type="range"
          min={0}
          max={23}
          step={1}
          value={selectedHour}
          onChange={(e) => onSelectHour(Number(e.target.value))}
          className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-accent focus:outline-none"
        />
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>00:00</span>
          <span>03:00</span>
          <span>06:00</span>
          <span>09:00</span>
          <span className="font-bold text-amber-400">12:00 (Noon)</span>
          <span>15:00</span>
          <span>18:00</span>
          <span>21:00</span>
          <span>23:00</span>
        </div>
      </div>

      {/* ── Live Physics Telemetry Badges ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ambient Temp
          </p>
          <p className="mt-0.5 font-mono text-base font-bold text-sky-400">
            {currentPoint.ambient_temp_c}°C
          </p>
          <p className="text-[10px] text-muted-foreground">Outdoor air</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Indoor Temp
          </p>
          <p className="mt-0.5 font-mono text-base font-bold text-emerald-400">
            {currentPoint.indoor_temp_c}°C
          </p>
          <p className="text-[10px] text-muted-foreground">ΔT: {currentPoint.delta_t_k} K difference</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Solar Radiation
            </p>
            <Sun size={12} className="text-amber-400" />
          </div>
          <p className="mt-0.5 font-mono text-base font-bold text-amber-400">
            {currentPoint.ghi_w_m2} W/m²
          </p>
          <p className="text-[10px] text-muted-foreground">Clear-sky GHI</p>
        </div>

        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
              Total Heat Loss
            </p>
            <Flame size={13} className="text-rose-400" />
          </div>
          <p className="mt-0.5 font-mono text-base font-bold text-rose-400">
            {currentPoint.q_total_w.toLocaleString()} W
          </p>
          <p className="text-[10px] text-rose-300/70">
            Walls: {currentPoint.q_walls_w}W · Roof: {currentPoint.q_roof_w}W · Glaze: {currentPoint.q_glazing_w}W · Floor: {currentPoint.q_floor_w}W
          </p>
        </div>
      </div>
    </div>
  );
}
