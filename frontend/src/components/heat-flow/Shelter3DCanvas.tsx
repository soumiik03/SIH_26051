"use client";

import React, { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ShelterGeometry, EnvelopeUValues, HourlyHeatFlowPoint } from "@/lib/api/heat-flow";
import { ShelterMesh } from "./ShelterMesh";
import { SunTracker } from "./SunTracker";
import { Eye, Layers, Compass, Sparkles } from "lucide-react";

interface Shelter3DCanvasProps {
  geometry: ShelterGeometry;
  uValues: EnvelopeUValues;
  currentPoint: HourlyHeatFlowPoint;
  hourlyData: HourlyHeatFlowPoint[];
  wallMaterial: string;
}

export function Shelter3DCanvas({
  geometry,
  uValues,
  currentPoint,
  hourlyData,
  wallMaterial,
}: Shelter3DCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [wireframe, setWireframe] = useState(false);
  const [showThermalHeatmap, setShowThermalHeatmap] = useState(true);

  // Dynamic sky background color based on solar elevation
  const skyColor = useMemo(() => {
    const elev = currentPoint.sun_elevation_deg;
    if (elev > 25) return "#0284c7"; // Midday high-altitude clear sky
    if (elev > 10) return "#0369a1"; // Morning / Afternoon crisp blue
    if (elev > 0) return "#431407"; // Alpenglow / Golden sunrise & sunset
    if (elev > -12) return "#1e1b4b"; // Twilight
    return "#030712"; // Deep Ladakh winter midnight
  }, [currentPoint.sun_elevation_deg]);

  // Ambient light level
  const ambientIntensity = useMemo(() => {
    if (currentPoint.is_sun_up) {
      return 0.4 + Math.max(0, currentPoint.sun_elevation_deg / 90) * 0.4;
    }
    return 0.15; // Soft starlight / snow bounce
  }, [currentPoint.is_sun_up, currentPoint.sun_elevation_deg]);

  // Quick camera jump presets
  const setCameraView = (view: "iso" | "south" | "top" | "east") => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (view === "iso") {
      ctrl.object.position.set(11, 7, 11);
    } else if (view === "south") {
      // Direct view at South glazing (+Z)
      ctrl.object.position.set(0, 3, 14);
    } else if (view === "top") {
      // Bird's-eye site plan view
      ctrl.object.position.set(0, 18, 0.1);
    } else if (view === "east") {
      // East gable entrance view (+X)
      ctrl.object.position.set(14, 3, 0);
    }
    ctrl.target.set(0, 1.3, 0);
    ctrl.update();
  };

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg sm:h-[540px]">
      {/* ── 3D Viewport Controls HUD ── */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 p-1.5 backdrop-blur-md">
        <button
          id="btn-view-iso"
          onClick={() => setCameraView("iso")}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          title="Isometric Perspective"
        >
          <Eye size={12} />
          <span>Iso</span>
        </button>
        <button
          id="btn-view-south"
          onClick={() => setCameraView("south")}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          title="South Glazing Direct View (Solar Gain)"
        >
          <Compass size={12} className="text-amber-400" />
          <span>South Glazing</span>
        </button>
        <button
          id="btn-view-top"
          onClick={() => setCameraView("top")}
          className="rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          title="Top-down Site Plan"
        >
          Top
        </button>
        <button
          id="btn-view-east"
          onClick={() => setCameraView("east")}
          className="rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          title="East Gable Entry"
        >
          East
        </button>

        <div className="mx-1 h-3.5 w-[1px] bg-border" />

        <button
          id="btn-toggle-thermal"
          onClick={() => setShowThermalHeatmap(!showThermalHeatmap)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            showThermalHeatmap
              ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title="Toggle Thermal Heat-Loss Radiation Effect"
        >
          <Sparkles size={12} />
          <span>Heat Loss Glow</span>
        </button>
        <button
          id="btn-toggle-wireframe"
          onClick={() => setWireframe(!wireframe)}
          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            wireframe
              ? "bg-accent/20 text-accent hover:bg-accent/30"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title="Toggle Geometry Wireframe"
        >
          <Layers size={12} />
          <span>Wireframe</span>
        </button>
      </div>

      {/* ── Solar & Heat Loss Status Badge ── */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-right backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Heat Loss Rate
          </span>
          <span className="font-mono text-sm font-bold text-rose-400">
            {currentPoint.q_total_w.toLocaleString()} W
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sun Elev: <strong className="text-foreground">{currentPoint.sun_elevation_deg}°</strong></span>
          <span>·</span>
          <span>Azimuth: <strong className="text-foreground">{currentPoint.sun_azimuth_deg}°</strong></span>
        </div>
      </div>

      {/* ── Orientation Guide (Compass) ── */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-md border border-border/40 bg-background/80 px-2.5 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-sm">
        <span className="text-sky-400 font-bold">▲ North (-Z)</span>
        <span>·</span>
        <span className="text-amber-400 font-bold">▼ South / Solar Gain (+Z)</span>
      </div>

      {/* ── 3D Canvas ── */}
      <Canvas
        shadows
        camera={{ position: [11, 7, 11], fov: 42 }}
        style={{ background: skyColor, transition: "background 0.5s ease" }}
      >
        <Suspense fallback={null}>
          {/* Ambient Lighting */}
          <ambientLight intensity={ambientIntensity} color="#e0f2fe" />
          <hemisphereLight
            args={["#93c5fd", "#1e293b", currentPoint.is_sun_up ? 0.35 : 0.15]}
          />

          {/* Real Solar Coordinate Tracker & Directional Light */}
          <SunTracker
            currentPoint={currentPoint}
            hourlyData={hourlyData}
            radius={14.0}
          />

          {/* Parametric Building Envelope */}
          <ShelterMesh
            geometry={geometry}
            uValues={uValues}
            currentPoint={currentPoint}
            wallMaterial={wallMaterial}
            wireframe={wireframe}
            showThermalHeatmap={showThermalHeatmap}
          />

          {/* Ground Plane with Snow / Soil Terrain */}
          <GroundTerrain />

          {/* Compass Rose on Ground Plane */}
          <GroundCompass />

          {/* Smooth Camera Controls */}
          <OrbitControls
            ref={controlsRef}
            target={[0, 1.3, 0]}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={4}
            maxDistance={30}
            enableDamping
            dampingFactor={0.08}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** Ground plane with subtle Ladakh snowy terrain and grid. */
function GroundTerrain() {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Snow-dusted terrain slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Subtle site coordinate grid */}
      <gridHelper args={[40, 40, "#334155", "#1e293b"]} position={[0, 0.01, 0]} />
    </group>
  );
}

/** Ground Compass Rose showing True North, South, East, West. */
function GroundCompass() {
  return (
    <group position={[0, 0.02, 0]}>
      {/* North marker (-Z) */}
      <Text
        position={[0, 0.05, -7.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
      >
        N
      </Text>

      {/* South marker (+Z) - Solar orientation */}
      <Text
        position={[0, 0.05, 7.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        S (Solar Gain)
      </Text>

      {/* East marker (+X) */}
      <Text
        position={[7.5, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        E
      </Text>

      {/* West marker (-X) */}
      <Text
        position={[-7.5, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        W
      </Text>
    </group>
  );
}
