"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, MathUtils, type Group, TubeGeometry, Vector3 } from "three";
import { LACORA_BANGLE_PALETTE } from "./bangle-palette";

const MAJOR_RADIUS = 0.79;
const BANGLE_ROTATION_SECONDS = 42;

function makeBraidGeometry(handedness: 1 | -1, phase: number) {
  const strandWraps = 3;
  const points = Array.from({ length: 361 }, (_, index) => {
    const aroundRing = (index / 360) * Math.PI * 2;
    const acrossBand = handedness * strandWraps * aroundRing + phase;
    const overUnder = handedness * Math.cos(acrossBand) * 0.033;
    const crossSection = 0.094 + overUnder;
    const radius = MAJOR_RADIUS + crossSection * Math.cos(acrossBand);
    const height = crossSection * Math.sin(acrossBand);

    return new Vector3(radius * Math.cos(aroundRing), radius * Math.sin(aroundRing), height);
  });
  const curve = new CatmullRomCurve3(points, true, "centripetal");

  return new TubeGeometry(curve, 540, 0.025, 10, true);
}

function WovenStrand({
  handedness,
  phase,
  color,
}: {
  handedness: 1 | -1;
  phase: number;
  color: string;
}) {
  const geometry = useMemo(() => makeBraidGeometry(handedness, phase), [handedness, phase]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh castShadow geometry={geometry} receiveShadow>
      <meshPhysicalMaterial
        clearcoat={0.85}
        clearcoatRoughness={0.2}
        color={color}
        metalness={0.02}
        roughness={0.23}
      />
    </mesh>
  );
}

function BangleRing({ color, height, stripe }: { color: string; height: number; stripe: string }) {
  const ringRadius = 0.057;

  return (
    <group position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow receiveShadow>
        <torusGeometry args={[MAJOR_RADIUS, ringRadius, 28, 192]} />
        <meshPhysicalMaterial
          clearcoat={0.95}
          clearcoatRoughness={0.18}
          color={color}
          metalness={0.015}
          roughness={0.22}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side}>
          <torusGeometry args={[MAJOR_RADIUS + side * 0.038, 0.005, 10, 192]} />
          <meshStandardMaterial color={stripe} metalness={0.28} roughness={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function CentreBraid() {
  const palette = LACORA_BANGLE_PALETTE;

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow receiveShadow>
        <torusGeometry args={[MAJOR_RADIUS, 0.078, 28, 192]} />
        <meshPhysicalMaterial
          clearcoat={0.9}
          clearcoatRoughness={0.2}
          color={palette.burgundyDeep}
          metalness={0.01}
          roughness={0.25}
        />
      </mesh>
      {[0, Math.PI].map((phase) => (
        <WovenStrand
          color={palette.burgundyLight}
          handedness={1}
          key={`ruby-${phase}`}
          phase={phase}
        />
      ))}
      {[Math.PI / 2, (Math.PI * 3) / 2].map((phase) => (
        <WovenStrand color={palette.ivory} handedness={-1} key={`ivory-${phase}`} phase={phase} />
      ))}
    </group>
  );
}

function BangleSet({ active }: { active: boolean }) {
  const stack = useRef<Group | null>(null);
  const palette = LACORA_BANGLE_PALETTE;

  useFrame((_, delta) => {
    if (!active || !stack.current) return;

    const stableDelta = Math.min(delta, 1 / 20);
    stack.current.rotation.y += (stableDelta * Math.PI * 2) / BANGLE_ROTATION_SECONDS;
    stack.current.rotation.x = MathUtils.damp(stack.current.rotation.x, 0.035, 2.4, stableDelta);
  });

  return (
    <>
      <hemisphereLight args={["#fff9f0", "#45101f", 1.45]} />
      <directionalLight
        castShadow
        intensity={2.5}
        position={[-3.6, 4.6, 4.8]}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <pointLight color="#fff3e3" intensity={24} position={[2.8, 2.1, 3.2]} />
      <pointLight color="#c34d69" intensity={12} position={[-3.2, 0.2, -2.4]} />

      <group ref={stack} scale={1.45}>
        <BangleRing color={palette.burgundy} height={0.35} stripe={palette.gold} />
        <BangleRing color={palette.ivory} height={0.23} stripe={palette.burgundyLight} />
        <CentreBraid />
        <BangleRing color={palette.ivory} height={-0.23} stripe={palette.burgundyLight} />
        <BangleRing color={palette.burgundy} height={-0.35} stripe={palette.gold} />
      </group>
    </>
  );
}

export function BangleScene({ active, onReady }: { active: boolean; onReady: () => void }) {
  return (
    <Canvas
      camera={{ fov: 31, position: [2.9, 2.05, 5.2] }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={onReady}
      shadows
    >
      <BangleSet active={active} />
    </Canvas>
  );
}
