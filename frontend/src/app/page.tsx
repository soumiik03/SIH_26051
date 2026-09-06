"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Thermometer,
  Building2,
  Zap,
  Leaf,
  BarChart3,
  Sun,
  Snowflake,
  Mountain,
  Layers,
  Flame,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Compass
} from "lucide-react";

// The 5 core exhibition workspaces
const WORKSPACES = [
  {
    id: "01",
    href: "/design",
    icon: Building2,
    eyebrow: "Envelope Synthesis",
    title: "Shelter Design Studio",
    tagline: "Vernacular passive architecture & envelope optimization",
    description:
      "Generate site-specific envelope specifications for extreme high-altitude Ladakh. Automatically calculate optimal Trombe wall thickness, south-facing glazing area, local stone-timber composite walls, and roof insulation R-values.",
    chips: ["Trombe Wall Physics", "Vernacular Stone & Timber", "R-Value Optimization"],
    stats: { label: "Solar Heat Retention", value: "Up to 88%" },
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    accentBorder: "group-hover:border-amber-600/50",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  {
    id: "02",
    href: "/indoor-temp",
    icon: Thermometer,
    eyebrow: "Predictive ML Model",
    title: "Indoor Temperature Forecaster",
    tagline: "Sub-zero climate diurnal comfort prediction",
    description:
      "Forecast indoor thermal comfort curves across severe Ladakh winter days down to -30°C. Powered by machine learning regression trained on atmospheric parameters, solar irradiance, and shelter thermal mass.",
    chips: ["Diurnal Temperature Cycles", "PMV / PPD Comfort Index", "Hourly ML Inferencing"],
    stats: { label: "Design Ambient", value: "-25°C to +18°C" },
    gradient: "from-sky-500/10 via-blue-500/5 to-transparent",
    accentBorder: "group-hover:border-sky-600/50",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  },
  {
    id: "03",
    href: "/thermal-energy",
    icon: Zap,
    eyebrow: "Energy & Emissions",
    title: "Thermal Energy & Demand",
    tagline: "Hourly heating demand & clean solar yield",
    description:
      "Quantify hourly space heating demand, passive solar energy capture, and auxiliary heating needs. Directly measure fossil-fuel (kerosene and coal) displacement to prove 100% clean Himalayan operations.",
    chips: ["Hourly kWh Profiling", "Solar Thermal Capture", "Zero Carbon Offset"],
    stats: { label: "Auxiliary Heating Cut", value: "75% - 100%" },
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    accentBorder: "group-hover:border-emerald-600/50",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    id: "04",
    href: "/heat-flow",
    icon: Leaf,
    eyebrow: "Thermodynamic Flow",
    title: "Heat Flow Visualizer",
    tagline: "Interactive conduction, convection & radiation model",
    description:
      "Inspect dynamic heat transfer across multi-layer walls, double/triple glazing, and insulated ceilings. Pinpoint thermal bridging zones and observe how heat is captured, stored, and retained during freezing nights.",
    chips: ["Envelope Flux Simulation", "Thermal Bridge Detection", "Real-time Temperature Gradient"],
    stats: { label: "Thermal Damping", value: "14+ Hours" },
    gradient: "from-rose-500/10 via-red-500/5 to-transparent",
    accentBorder: "group-hover:border-rose-600/50",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
  {
    id: "05",
    href: "/dashboard",
    icon: BarChart3,
    eyebrow: "Integrated Intelligence",
    title: "Executive Decision Dashboard",
    tagline: "Holistic workspace uniting comfort, energy & economics",
    description:
      "Bring together all models in a unified decision-making cockpit. Evaluate design trade-offs, compare multiple envelope configurations side-by-side, and generate comprehensive, publication-ready engineering reports.",
    chips: ["Multi-Variable Tradeoffs", "Cost vs. Comfort Curves", "Printable PDF Reports"],
    stats: { label: "Comprehensive Metrics", value: "5-in-1 Suite" },
    gradient: "from-purple-500/10 via-indigo-500/5 to-transparent",
    accentBorder: "group-hover:border-purple-600/50",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
];

// Top thematic icons inspired by the Crypto World's Fair token row
const FAIR_ICONS = [
  { icon: Sun, label: "Solar Geometry", tooltip: "High-Altitude Solar Radiation" },
  { icon: Snowflake, label: "Sub-Zero", tooltip: "-30°C Winter Extreme" },
  { icon: Mountain, label: "Ladakh", tooltip: "3,500m High Altitude" },
  { icon: Layers, label: "Trombe Wall", tooltip: "Passive Thermal Mass" },
  { icon: Building2, label: "Vernacular", tooltip: "Stone & Timber Architecture" },
  { icon: Flame, label: "Thermal Comfort", tooltip: "18°C Interior Target" },
  { icon: Leaf, label: "Zero Carbon", tooltip: "100% Fossil Fuel Free" },
  { icon: Sparkles, label: "Predictive AI", tooltip: "Physics-Informed ML Models" },
];

export default function HimalayanFairHome() {
  const cardsSectionRef = useRef<HTMLDivElement>(null);

  const scrollToCards = () => {
    if (cardsSectionRef.current) {
      cardsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#181412] text-[#F6F1E7] selection:bg-[#B65C38] selection:text-white font-sans overflow-x-hidden">
      {/* ========================================================================= */}
      {/* HERO SECTION (Faithful recreation of Crypto World's Fair painting vista)  */}
      {/* ========================================================================= */}
      <section className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden">
        {/* Background Painting */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/himalayan-fair.png"
            alt="Himalayan Thermal Fair painting: vernacular stone shelter overlooking snow-capped Ladakh mountains and monastery"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_35%] filter brightness-[0.98] contrast-[1.03]"
          />

          {/* Atmospheric lighting gradients - preserving the painting while enhancing text contrast */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/85" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#181412] via-[#181412]/80 to-transparent" />
        </div>

        {/* TOP BAR: Classical Neoclassical Emblem + Row of Thematic Tokens */}
        <div className="relative z-10 w-full px-6 pt-6 sm:px-10 sm:pt-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Top Left Brand Emblem (Classic roman serif style) */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center border border-[#F6F1E7]/40 bg-black/40 backdrop-blur-md text-[#EAD8B7] shadow-sm">
              <Compass size={18} className="stroke-[1.75]" />
            </span>
            <div className="flex flex-col">
              <span className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.28em] text-[#F6F1E7] uppercase drop-shadow-md">
                THERMAFORM
              </span>
              <span className="text-[9px] font-mono tracking-[0.2em] text-[#EAD8B7]/80 uppercase">
                SIH 26051 · HIGH ALTITUDE LAB
              </span>
            </div>
          </div>

          {/* Top Center: Row of 8 Minimalist Thematic Icons (Like the crypto token row) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-black/35 backdrop-blur-md shadow-lg">
            {FAIR_ICONS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  title={item.tooltip}
                  className="group relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white/90 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  <Icon size={14} className="sm:size-4 transition-transform group-hover:scale-110" />
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-[10px] text-amber-200 px-2 py-0.5 whitespace-nowrap rounded border border-white/20 z-50">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Top Right: Altitude & Region Badge */}
          <div className="hidden lg:flex items-center gap-2 text-right">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono tracking-widest text-[#EAD8B7] uppercase font-semibold">
                LADAKH REGION
              </span>
              <span className="text-[9px] font-mono tracking-wider text-white/70">
                ELEVATION 3,500m · COLD ARID
              </span>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* HERO CENTERPIECE: Grand Engraved Title, Subtitle, Verified Anchor, CTA & Quiet Workspace Row */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 my-auto py-12 sm:py-16 text-center flex flex-col items-center">
          {/* Main Title: Two-line large-scale serif treatment */}
          <h1 className="font-cinzel text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-bold uppercase tracking-[0.14em] text-white leading-[1.08] drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
            PASSIVE SHELTER<br />
            INTELLIGENCE
          </h1>

          {/* Subheadline: Concise, accurate scope */}
          <p className="mt-5 sm:mt-7 max-w-2xl text-sm sm:text-base md:text-lg font-normal leading-relaxed text-[#FFFDF5] drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
            Predict how a shelter performs in extreme cold. Optimize what it&apos;s built from. Grounded in real climate data and real material costs.
          </p>

          {/* Problem Statement Anchor Line (Real & Verifiable) */}
          <p className="mt-4 font-cinzel text-xs sm:text-sm tracking-[0.24em] uppercase text-[#EAD8B7] drop-shadow-md">
            SIH 2026 · PROBLEM STATEMENT 26051
          </p>

          {/* Vintage "❖ ENTER THE FIVE WORKSPACES ❖" action button */}
          <div className="mt-7 sm:mt-9 flex flex-col items-center">
            <button
              onClick={scrollToCards}
              className="fair-btn group flex items-center gap-3 bg-[#4c2131]/90 hover:bg-[#63293f] px-8 py-3.5 text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-white cursor-pointer"
            >
              <span className="text-amber-300 transition-transform group-hover:rotate-45 duration-300">❖</span>
              <span>ENTER THE FIVE WORKSPACES</span>
              <span className="text-amber-300 transition-transform group-hover:-rotate-45 duration-300">❖</span>
            </button>

            {/* Quiet, letter-spaced workspace names row replacing the removed fabricated console */}
            <p className="mt-6 text-[10px] sm:text-xs font-mono tracking-[0.22em] uppercase text-[#EAD8B7]/75 drop-shadow-sm">
              INDOOR TEMPERATURE · SHELTER DESIGN · THERMAL ENERGY · HEAT FLOW · OPTIMIZATION
            </p>
          </div>
        </div>

        {/* Scroll Indicator Prompt */}
        <div className="relative z-10 pb-8 sm:pb-10 text-center">
          <button
            onClick={scrollToCards}
            className="group inline-flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <span className="font-cinzel text-[10px] sm:text-xs tracking-[0.25em] uppercase">
              Scroll To Discover Workspaces
            </span>
            <ChevronDown
              size={18}
              className="animate-bounce text-amber-300 group-hover:translate-y-1 transition-transform"
            />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: SMOOTH SCROLL REVEAL — THE FIVE SPECIALIZED CARDS             */}
      {/* ========================================================================= */}
      <section
        ref={cardsSectionRef}
        id="workspaces"
        className="relative z-20 py-20 sm:py-28 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto"
      >
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[90vw] max-w-5xl h-96 bg-gradient-to-b from-[#B65C38]/15 via-transparent to-transparent blur-3xl -z-10" />

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase mb-4">
            <Sparkles size={13} />
            <span>EXHIBITION OF THE FIVE WORKSPACES</span>
          </div>

          <h2 className="font-cinzel text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase">
            Engineered For The Extreme Himalayan Cold
          </h2>

          <p className="mt-4 text-sm sm:text-base text-[#F6F1E7]/70 leading-relaxed max-w-2xl mx-auto">
            Choose a specialized workspace to simulate, predict, and optimize passive shelter performance.
            Every tool eliminates guesswork with physics-informed artificial intelligence and localized Ladakh environmental data.
          </p>
        </div>

        {/* THE FIVE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-8">
          {WORKSPACES.map((card, idx) => {
            const Icon = card.icon;
            const isBottomRow = idx >= 3;

            return (
              <div
                key={card.id}
                className={`group relative flex flex-col justify-between rounded-sm border border-[#3b322a] bg-[#221c18] p-7 sm:p-8 transition-all duration-300 hover:-translate-y-2 hover:border-[#B65C38] hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] ${
                  isBottomRow
                    ? "col-span-1 md:col-span-1 lg:col-span-3"
                    : "col-span-1 md:col-span-1 lg:col-span-2"
                }`}
              >
                {/* Subtle card top gradient */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-sm`}
                />

                <div className="relative z-10">
                  {/* Card Top: Number + Eyebrow + Metric */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#362e27]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400/90 tracking-wider">
                        [{card.id}]
                      </span>
                      <span className="text-[11px] font-mono tracking-widest uppercase text-white/50">
                        {card.eyebrow}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-xs">
                      {card.stats.value}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-white/5 text-amber-400 group-hover:bg-[#B65C38] group-hover:text-white transition-colors duration-300">
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white group-hover:text-amber-200 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-[#EAD8B7]/80 font-medium mt-0.5">
                        {card.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm leading-relaxed text-[#F6F1E7]/75 mt-3 mb-6">
                    {card.description}
                  </p>

                  {/* Feature chips */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {card.chips.map((chip, cIdx) => (
                      <span
                        key={cIdx}
                        className="text-[10px] font-mono tracking-tight bg-white/5 border border-white/10 text-white/70 px-2 py-1 rounded-xs"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="relative z-10 pt-4 border-t border-[#362e27]">
                  <Link
                    href={card.href}
                    className="flex items-center justify-between w-full py-2.5 px-4 bg-white/5 hover:bg-[#B65C38] text-white border border-white/15 hover:border-[#B65C38] text-xs font-semibold tracking-wider uppercase rounded-xs transition-all duration-200 group-hover:shadow-md"
                  >
                    <span>Launch Workspace</span>
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1 text-amber-300 group-hover:text-white"
                    />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Fair Footer Citation */}
        <div className="mt-20 pt-10 border-t border-[#362e27] text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-cinzel font-bold">THERMAFORM</span>
            <span>· High-Altitude Passive Architecture & Thermal Comfort Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-amber-300 transition-colors uppercase font-mono tracking-wider text-[11px]"
            >
              ↑ Back to Top
            </button>
            <Link href="/dashboard" className="hover:text-amber-300 transition-colors">
              Executive Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
