"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ShelterGeometry, EnvelopeUValues, HourlyHeatFlowPoint } from "@/lib/api/heat-flow";

interface ShelterMeshProps {
  geometry: ShelterGeometry;
  uValues: EnvelopeUValues;
  currentPoint: HourlyHeatFlowPoint;
  wallMaterial: string;
  wireframe?: boolean;
  showThermalHeatmap?: boolean;
}

export function ShelterMesh({
  geometry,
  uValues,
  currentPoint,
  wallMaterial,
  wireframe = false,
  showThermalHeatmap = true,
}: ShelterMeshProps) {
  const pulseRef = useRef<THREE.Group>(null);

  const {
    length_m: L,
    width_m: W,
    wall_height_m: H_wall,
    roof_height_m: H_roof,
  } = geometry;

  // Thermal heat loss intensity (0.0 to 1.0 normalized)
  const lossIntensity = useMemo(() => {
    // Standard Ladakh envelope loss ranges from 150W (warm noon) to 1200W (sub-zero night)
    return Math.min(1.0, Math.max(0.1, currentPoint.q_total_w / 1000.0));
  }, [currentPoint.q_total_w]);

  // Wall base color dependent on chosen building material
  const baseWallColor = useMemo(() => {
    const mat = wallMaterial.toLowerCase();
    if (mat.includes("rammed")) return "#92400e"; // Warm rammed earth ochre
    if (mat.includes("mud") || mat.includes("brick")) return "#b45309"; // Sun-dried adobe brick
    if (mat.includes("concrete")) return "#64748b"; // Cast concrete
    return "#57534e"; // Natural Ladakh stone masonry
  }, [wallMaterial]);

  // Wall thermal emissive glow based on heat loss rate (Watts)
  const emissiveColor = useMemo(() => {
    if (!showThermalHeatmap) return "#000000";
    // Heat loss emits infrared thermal radiation glow (cyan -> amber -> deep coral red)
    if (lossIntensity > 0.75) return "#dc2626"; // High loss (cold winter night)
    if (lossIntensity > 0.45) return "#ea580c"; // Medium loss
    if (lossIntensity > 0.25) return "#f59e0b"; // Mild loss
    return "#0ea5e9"; // Very low loss / balanced
  }, [lossIntensity, showThermalHeatmap]);

  const emissiveIntensity = useMemo(() => {
    if (!showThermalHeatmap) return 0;
    return 0.15 + lossIntensity * 0.45;
  }, [lossIntensity, showThermalHeatmap]);

  // Window geometry on South facade (+Z)
  // Window area = geometry.glazing_area_m2
  const windowHeight = 1.3;
  const windowWidth = Math.min(L * 0.85, Math.max(1.0, geometry.glazing_area_m2 / windowHeight));

  // Door geometry (East wall or offset on South)
  const doorW = 0.9;
  const doorH = 2.0;

  // Custom roof geometry: 2 pitches meeting at the ridge
  const roofPitchAngle = Math.atan2(H_roof, W / 2);
  const slopeLength = Math.sqrt(Math.pow(W / 2, 2) + Math.pow(H_roof, 2)) + 0.3; // with overhang
  const roofOverhangX = L + 0.5;

  // Animate pulse waves representing heat escaping through the envelope
  useFrame((state) => {
    if (pulseRef.current && showThermalHeatmap) {
      const t = state.clock.getElapsedTime();
      const scale = 1.0 + 0.03 * Math.sin(t * 3.0 * (0.8 + lossIntensity));
      pulseRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── Concrete/Stone Plinth Foundation ── */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[L + 0.6, 0.2, W + 0.6]} />
        <meshStandardMaterial color="#334155" roughness={0.9} wireframe={wireframe} />
      </mesh>

      {/* ── Main Living Envelope (Walls) ── */}
      <group position={[0, 0.2, 0]}>
        {/* North Wall (-Z) */}
        <mesh position={[0, H_wall / 2, -W / 2]} castShadow receiveShadow>
          <boxGeometry args={[L, H_wall, 0.25]} />
          <meshStandardMaterial
            color={baseWallColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.8}
            wireframe={wireframe}
          />
        </mesh>

        {/* South Wall (+Z) with Glazing Cutout */}
        <group position={[0, 0, W / 2]}>
          {/* Wall header above window */}
          <mesh position={[0, H_wall - (H_wall - windowHeight - 0.5) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[L, H_wall - windowHeight - 0.5, 0.25]} />
            <meshStandardMaterial
              color={baseWallColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
              wireframe={wireframe}
            />
          </mesh>

          {/* Wall sill below window */}
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[L, 0.5, 0.25]} />
            <meshStandardMaterial
              color={baseWallColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
              wireframe={wireframe}
            />
          </mesh>

          {/* Wall sides flanking window */}
          <mesh
            position={[-(L / 2 - (L - windowWidth) / 4), 0.5 + windowHeight / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[(L - windowWidth) / 2, windowHeight, 0.25]} />
            <meshStandardMaterial
              color={baseWallColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
              wireframe={wireframe}
            />
          </mesh>
          <mesh
            position={[L / 2 - (L - windowWidth) / 4, 0.5 + windowHeight / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[(L - windowWidth) / 2, windowHeight, 0.25]} />
            <meshStandardMaterial
              color={baseWallColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
              wireframe={wireframe}
            />
          </mesh>

          {/* South Glazing Pane (Glass) */}
          <mesh position={[0, 0.5 + windowHeight / 2, 0]} castShadow>
            <boxGeometry args={[windowWidth, windowHeight, 0.08]} />
            <meshPhysicalMaterial
              color="#38bdf8"
              transmission={0.85}
              opacity={0.7}
              transparent
              roughness={0.08}
              ior={1.52}
              reflectivity={0.9}
            />
          </mesh>

          {/* Window Timber/Aluminium Framing Grid */}
          <mesh position={[0, 0.5 + windowHeight / 2, 0.06]}>
            <boxGeometry args={[windowWidth + 0.06, 0.05, 0.05]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.5 + windowHeight / 2, 0.06]}>
            <boxGeometry args={[0.05, windowHeight + 0.06, 0.05]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>

        {/* East Wall (+X) with Entrance Door */}
        <group position={[L / 2, 0, 0]}>
          {/* Main wall body */}
          <mesh position={[0, H_wall / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.25, H_wall, W]} />
            <meshStandardMaterial
              color={baseWallColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
              wireframe={wireframe}
            />
          </mesh>

          {/* Timber Entry Door */}
          <mesh position={[0.13, doorH / 2, 0]} castShadow>
            <boxGeometry args={[0.05, doorH, doorW]} />
            <meshStandardMaterial color="#451a03" roughness={0.7} />
          </mesh>
        </group>

        {/* West Wall (-X) */}
        <mesh position={[-L / 2, H_wall / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, H_wall, W]} />
          <meshStandardMaterial
            color={baseWallColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.8}
            wireframe={wireframe}
          />
        </mesh>

        {/* East & West Gable End Triangles */}
        <GableEnd
          position={[L / 2, H_wall, 0]}
          width={W}
          height={H_roof}
          color={baseWallColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          wireframe={wireframe}
        />
        <GableEnd
          position={[-L / 2, H_wall, 0]}
          width={W}
          height={H_roof}
          color={baseWallColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          wireframe={wireframe}
          flip
        />

        {/* ── Gable Roof Slopes (North & South) ── */}
        {/* South Pitch */}
        <mesh
          position={[0, H_wall + H_roof / 2, W / 4]}
          rotation={[roofPitchAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[roofOverhangX, 0.12, slopeLength]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity * 0.6}
            roughness={0.5}
            metalness={0.3}
            wireframe={wireframe}
          />
        </mesh>

        {/* North Pitch */}
        <mesh
          position={[0, H_wall + H_roof / 2, -W / 4]}
          rotation={[-roofPitchAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[roofOverhangX, 0.12, slopeLength]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity * 0.6}
            roughness={0.5}
            metalness={0.3}
            wireframe={wireframe}
          />
        </mesh>

        {/* Roof Ridge Cap Beam */}
        <mesh position={[0, H_wall + H_roof + 0.06, 0]} castShadow>
          <boxGeometry args={[roofOverhangX + 0.1, 0.08, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>

        {/* ── Interior Warm Hearth / Occupancy Glow ── */}
        {/* Visible through south window at night/evening */}
        <pointLight
          position={[0, 1.2, 0]}
          intensity={0.8 + currentPoint.indoor_temp_c * 0.05}
          distance={6}
          color="#fef08a"
        />

        {/* ── Thermal Loss Radiation Halo ── */}
        {showThermalHeatmap && (
          <group ref={pulseRef}>
            <mesh position={[0, H_wall / 2, 0]}>
              <boxGeometry args={[L + 0.4, H_wall + 0.4, W + 0.4]} />
              <meshBasicMaterial
                color={emissiveColor}
                transparent
                opacity={0.08 * lossIntensity}
                side={THREE.BackSide}
              />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/** Helper component to construct triangular gable walls at the ends. */
function GableEnd({
  position,
  width,
  height,
  color,
  emissive,
  emissiveIntensity,
  wireframe,
  flip = false,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  wireframe: boolean;
  flip?: boolean;
}) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    // Triangle from (-W/2, 0) to (0, H_roof) to (W/2, 0)
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();

    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [width, height]);

  return (
    <mesh
      geometry={geom}
      position={[position[0] - (flip ? 0 : 0.25), position[1], position[2]]}
      rotation={[0, flip ? -Math.PI / 2 : Math.PI / 2, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.8}
        wireframe={wireframe}
      />
    </mesh>
  );
}
