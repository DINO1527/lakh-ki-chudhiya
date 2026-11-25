"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  MathUtils,
  type Group,
  TubeGeometry,
  Vector3,
} from "three";
import { LACORA_BANGLE_PALETTE } from "./bangle-palette";

const INNER_RADIUS = 0.7;
const OUTER_RING_PROFILE = { radial: 0.06, vertical: 0.046 };
const SPACER_RING_PROFILE = { radial: 0.055, vertical: 0.045 };
const CENTRE_RING_PROFILE = { radial: 0.085, vertical: 0.058 };
const BRAID_PROFILE = {
  weaveDepth: 0.005,
  strandDepth: 0.009,
  strandWidth: 0.0145,
  surfaceLift: 0.0015,
  majorRadius: INNER_RADIUS + CENTRE_RING_PROFILE.radial,
};
const BRAID_DIRECTIONS = 16;
const BRAID_WRAPS = 10;
const BRAID_HANDS = [-1, 1] as const;
const BRAID_COLORS = [
  LACORA_BANGLE_PALETTE.ruby,
  LACORA_BANGLE_PALETTE.burgundy,
  LACORA_BANGLE_PALETTE.burgundyDeep,
] as const;
const MODEL_SEGMENTS = 448;
const INTRO_SECONDS = 5.2;
const COPY_REVEAL_SECONDS = 3.1;
const OPENING_SCALE_LANDSCAPE = 2.95;
const OPENING_SCALE_PORTRAIT = 2.85;
const RESTING_SCALE_LANDSCAPE = 1.18;
const RESTING_SCALE_PORTRAIT = 1.7;
const COMPACT_RESTING_SCALE_PORTRAIT = 1.65;
const RESTING_X_LANDSCAPE = 0.42;
const RESTING_Y_PORTRAIT = -0.16;
const ENTRANCE_START_SCALE = 0.88;
const BANGLE_ROTATION_SECONDS = 42;
const EXPLODED_CYCLE_SECONDS = 28;
const OUTER_RING_Y = 0.25;
const SPACER_RING_Y = 0.15;
const OUTER_EXPLODE_DISTANCE = 0.11;
const SPACER_EXPLODE_DISTANCE = 0.055;

type RingProfile = { radial: number; vertical: number };

function makeRoundedBandGeometry(majorRadius: number, profile: RingProfile) {
  const ringSegments = 288;
  const crossSegments = 36;
  const rowSize = crossSegments;
  const positions = new Float32Array(ringSegments * rowSize * 3);
  const indices: number[] = [];

  for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
    const aroundRing = (ringIndex / ringSegments) * Math.PI * 2;
    const cosRing = Math.cos(aroundRing);
    const sinRing = Math.sin(aroundRing);

    for (let crossIndex = 0; crossIndex < crossSegments; crossIndex += 1) {
      const aroundProfile = (crossIndex / crossSegments) * Math.PI * 2;
      const radial = majorRadius + profile.radial * Math.cos(aroundProfile);
      const vertex = (ringIndex * rowSize + crossIndex) * 3;
      positions[vertex] = radial * cosRing;
      positions[vertex + 1] = profile.vertical * Math.sin(aroundProfile);
      positions[vertex + 2] = radial * sinRing;
    }
  }

  for (let ringIndex = 0; ringIndex < ringSegments; ringIndex += 1) {
    const nextRing = (ringIndex + 1) % ringSegments;
    for (let crossIndex = 0; crossIndex < crossSegments; crossIndex += 1) {
      const a = ringIndex * rowSize + crossIndex;
      const nextCross = (crossIndex + 1) % crossSegments;
      const b = nextRing * rowSize + crossIndex;
      const c = nextRing * rowSize + nextCross;
      const d = ringIndex * rowSize + nextCross;
      indices.push(a, d, b, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeOuterOrnament(majorRadius: number, profile: RingProfile, phase: number) {
  const points = Array.from({ length: MODEL_SEGMENTS }, (_, index) => {
    const aroundRing = (index / MODEL_SEGMENTS) * Math.PI * 2;
    const diagonal = 8 * aroundRing + phase;
    const profileAngle = (Math.PI / 2) * Math.sin(diagonal);
    const radial = majorRadius + profile.radial * Math.cos(profileAngle) + 0.0012;

    return new Vector3(
      radial * Math.cos(aroundRing),
      profile.vertical * Math.sin(profileAngle),
      radial * Math.sin(aroundRing),
    );
  });
  const curve = new CatmullRomCurve3(points, true, "centripetal");
  return new TubeGeometry(curve, MODEL_SEGMENTS, 0.0022, 5, true);
}

function braidPoint(theta: number, handedness: 1 | -1, phase: number) {
  const angle = handedness * BRAID_WRAPS * theta + phase;
  const profileCosine = Math.cos(angle);
  const profileSine = Math.sin(angle);
  const radius = BRAID_PROFILE.majorRadius + CENTRE_RING_PROFILE.radial * profileCosine;
  const vertical = CENTRE_RING_PROFILE.vertical * profileSine;
  const surfaceNormal = new Vector3(
    (profileCosine / CENTRE_RING_PROFILE.radial) * Math.cos(theta),
    profileSine / CENTRE_RING_PROFILE.vertical,
    (profileCosine / CENTRE_RING_PROFILE.radial) * Math.sin(theta),
  ).normalize();
  const weaveOffset = handedness * BRAID_PROFILE.weaveDepth * Math.tanh(5 * profileCosine);
  const center = new Vector3(
    radius * Math.cos(theta),
    vertical,
    radius * Math.sin(theta),
  ).addScaledVector(surfaceNormal, BRAID_PROFILE.surfaceLift + weaveOffset);

  return {
    center,
    normal: surfaceNormal,
    angle,
  };
}

function braidFrame(theta: number, handedness: 1 | -1, phase: number) {
  const current = braidPoint(theta, handedness, phase);
  const epsilon = 0.0001;
  const before = braidPoint(theta - epsilon, handedness, phase).center;
  const after = braidPoint(theta + epsilon, handedness, phase).center;
  const tangent = after.sub(before).normalize();
  const lateral = tangent.clone().cross(current.normal).normalize();

  return { ...current, lateral };
}

function makeOuterBraidStrandGeometry(handedness: 1 | -1, phase: number) {
  const crossSegments = 10;
  const positions = new Float32Array(MODEL_SEGMENTS * crossSegments * 3);
  const indices: number[] = [];

  for (let ringIndex = 0; ringIndex < MODEL_SEGMENTS; ringIndex += 1) {
    const theta = (ringIndex / MODEL_SEGMENTS) * Math.PI * 2;
    const frame = braidFrame(theta, handedness, phase);

    for (let crossIndex = 0; crossIndex < crossSegments; crossIndex += 1) {
      const aroundStrand = (crossIndex / crossSegments) * Math.PI * 2;
      const position = frame.center
        .clone()
        .addScaledVector(frame.normal, BRAID_PROFILE.strandDepth * Math.cos(aroundStrand))
        .addScaledVector(frame.lateral, BRAID_PROFILE.strandWidth * Math.sin(aroundStrand));
      const vertex = (ringIndex * crossSegments + crossIndex) * 3;
      positions[vertex] = position.x;
      positions[vertex + 1] = position.y;
      positions[vertex + 2] = position.z;
    }
  }

  for (let ringIndex = 0; ringIndex < MODEL_SEGMENTS; ringIndex += 1) {
    const nextRing = (ringIndex + 1) % MODEL_SEGMENTS;
    for (let crossIndex = 0; crossIndex < crossSegments; crossIndex += 1) {
      const nextCross = (crossIndex + 1) % crossSegments;
      const a = ringIndex * crossSegments + crossIndex;
      const b = nextRing * crossSegments + crossIndex;
      const c = nextRing * crossSegments + nextCross;
      const d = ringIndex * crossSegments + nextCross;
      indices.push(a, d, b, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBraidAccent(handedness: 1 | -1, phase: number, surfaceAngle: number) {
  const points = Array.from({ length: MODEL_SEGMENTS }, (_, index) => {
    const theta = (index / MODEL_SEGMENTS) * Math.PI * 2;
    const frame = braidFrame(theta, handedness, phase);

    return frame.center
      .clone()
      .addScaledVector(frame.normal, BRAID_PROFILE.strandDepth * 0.92 * Math.cos(surfaceAngle))
      .addScaledVector(frame.lateral, BRAID_PROFILE.strandWidth * 0.92 * Math.sin(surfaceAngle));
  });
  const curve = new CatmullRomCurve3(points, true, "centripetal");
  return new TubeGeometry(curve, MODEL_SEGMENTS, 0.00145, 5, true);
}

function OrnamentedOuterRing({ profile }: { profile: RingProfile }) {
  const majorRadius = INNER_RADIUS + profile.radial;
  const geometry = useMemo(
    () => makeRoundedBandGeometry(majorRadius, profile),
    [majorRadius, profile],
  );
  const ornaments = useMemo(
    () =>
      [0, 0.16, 0.31, 0.92, 1.08, 1.23].map((phase, index) => ({
        geometry: makeOuterOrnament(majorRadius, profile, phase),
        color:
          index % 3 === 0
            ? LACORA_BANGLE_PALETTE.gold
            : index % 3 === 1
              ? LACORA_BANGLE_PALETTE.goldBright
              : LACORA_BANGLE_PALETTE.ivory,
      })),
    [majorRadius, profile],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      ornaments.forEach((ornament) => ornament.geometry.dispose());
    },
    [geometry, ornaments],
  );

  return (
    <>
      <mesh castShadow geometry={geometry} receiveShadow>
        <meshPhysicalMaterial
          clearcoat={0.96}
          clearcoatRoughness={0.13}
          color={LACORA_BANGLE_PALETTE.burgundy}
          metalness={0.05}
          roughness={0.2}
        />
      </mesh>
      {ornaments.map((ornament, index) => (
        <mesh geometry={ornament.geometry} key={index}>
          <meshStandardMaterial
            color={ornament.color}
            metalness={ornament.color === LACORA_BANGLE_PALETTE.ivory ? 0.04 : 0.66}
            roughness={ornament.color === LACORA_BANGLE_PALETTE.ivory ? 0.3 : 0.25}
          />
        </mesh>
      ))}
    </>
  );
}

function SmoothSpacerRing({ profile }: { profile: RingProfile }) {
  const majorRadius = INNER_RADIUS + profile.radial;
  const geometry = useMemo(
    () => makeRoundedBandGeometry(majorRadius, profile),
    [majorRadius, profile],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh castShadow geometry={geometry} receiveShadow>
      <meshPhysicalMaterial
        clearcoat={0.98}
        clearcoatRoughness={0.12}
        color={LACORA_BANGLE_PALETTE.ivory}
        metalness={0.015}
        roughness={0.18}
      />
    </mesh>
  );
}

function combineGeometries(geometries: BufferGeometry[]) {
  const positions: number[] = [];
  const indices: number[] = [];

  for (const geometry of geometries) {
    const position = geometry.getAttribute("position");
    const vertexOffset = positions.length / 3;

    for (let vertex = 0; vertex < position.count; vertex += 1) {
      positions.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
    }

    const index = geometry.getIndex();
    if (index) {
      for (let faceIndex = 0; faceIndex < index.count; faceIndex += 1) {
        indices.push(index.getX(faceIndex) + vertexOffset);
      }
    }
    geometry.dispose();
  }

  const combined = new BufferGeometry();
  combined.setAttribute("position", new Float32BufferAttribute(positions, 3));
  combined.setIndex(indices);
  combined.computeVertexNormals();
  combined.computeBoundingSphere();
  return combined;
}

function makeBraidLayers() {
  const layers = new Map<string, BufferGeometry[]>();
  const add = (color: string, geometry: BufferGeometry) => {
    const geometries = layers.get(color) ?? [];
    geometries.push(geometry);
    layers.set(color, geometries);
  };

  for (const handedness of BRAID_HANDS) {
    for (let index = 0; index < BRAID_DIRECTIONS; index += 1) {
      const phase = (index / BRAID_DIRECTIONS) * Math.PI * 2;
      const color = BRAID_COLORS[(index + (handedness === -1 ? 1 : 0)) % BRAID_COLORS.length];
      add(color, makeOuterBraidStrandGeometry(handedness, phase));
      add(LACORA_BANGLE_PALETTE.gold, makeBraidAccent(handedness, phase, 0.08));

      if (index % 2 === 0) {
        add(LACORA_BANGLE_PALETTE.goldBright, makeBraidAccent(handedness, phase, -0.58));
      }

      if (index % 4 === 0) {
        add(LACORA_BANGLE_PALETTE.ivory, makeBraidAccent(handedness, phase, 0.72));
      }
    }
  }

  return Array.from(layers, ([color, geometries]) => ({
    color,
    geometry: combineGeometries(geometries),
  }));
}

function CentreBraid() {
  const core = useMemo(
    () => makeRoundedBandGeometry(BRAID_PROFILE.majorRadius, CENTRE_RING_PROFILE),
    [],
  );
  const braidLayers = useMemo(() => makeBraidLayers(), []);
  useEffect(() => () => core.dispose(), [core]);
  useEffect(() => () => braidLayers.forEach((layer) => layer.geometry.dispose()), [braidLayers]);

  return (
    <group>
      <mesh castShadow geometry={core} receiveShadow>
        <meshPhysicalMaterial
          clearcoat={0.92}
          clearcoatRoughness={0.19}
          color={LACORA_BANGLE_PALETTE.burgundy}
          metalness={0.02}
          roughness={0.24}
        />
      </mesh>
      {braidLayers.map((layer) => (
        <mesh geometry={layer.geometry} key={layer.color} receiveShadow>
          <meshPhysicalMaterial
            clearcoat={layer.color === LACORA_BANGLE_PALETTE.gold ? 0.7 : 0.93}
            clearcoatRoughness={0.16}
            color={layer.color}
            metalness={
              layer.color === LACORA_BANGLE_PALETTE.gold
                ? 0.7
                : layer.color === LACORA_BANGLE_PALETTE.ivory
                  ? 0.04
                  : 0.035
            }
            roughness={layer.color === LACORA_BANGLE_PALETTE.gold ? 0.24 : 0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

type EntranceMotion = {
  delay: number;
  duration: number;
  start: [number, number, number];
  arc: [number, number, number];
  tilt: [number, number, number];
};

const RING_ENTRANCE: Record<
  "outerTop" | "spacerTop" | "centre" | "spacerBottom" | "outerBottom",
  EntranceMotion
> = {
  outerTop: {
    delay: 0.05,
    duration: 2.75,
    start: [-0.3, 0.16, 0.07],
    arc: [0.04, 0.07, -0.02],
    tilt: [-0.18, 0.1, 0.2],
  },
  spacerTop: {
    delay: 0.22,
    duration: 2.55,
    start: [0.32, 0.07, -0.08],
    arc: [-0.04, -0.03, 0.02],
    tilt: [0.09, -0.08, 0.14],
  },
  centre: {
    delay: 0.12,
    duration: 2.9,
    start: [-0.24, -0.11, 0.05],
    arc: [0.03, 0.04, -0.01],
    tilt: [0.12, 0.05, -0.15],
  },
  spacerBottom: {
    delay: 0.38,
    duration: 2.5,
    start: [0.27, -0.07, 0.09],
    arc: [0.02, 0.05, -0.03],
    tilt: [-0.1, 0.08, -0.16],
  },
  outerBottom: {
    delay: 0.54,
    duration: 2.45,
    start: [-0.09, -0.16, -0.11],
    arc: [-0.03, 0.01, 0.04],
    tilt: [0.16, -0.04, 0.18],
  },
};

function animateRingEntrance(
  ring: Group,
  targetY: number,
  motion: EntranceMotion,
  elapsed: number,
  separation: number,
) {
  const progress = MathUtils.smoothstep(elapsed - motion.delay, 0, motion.duration);
  const arc = Math.sin(progress * Math.PI);

  ring.position.set(
    motion.start[0] * (1 - progress) + motion.arc[0] * arc,
    targetY + motion.start[1] * (1 - progress) + motion.arc[1] * arc + separation,
    motion.start[2] * (1 - progress) + motion.arc[2] * arc,
  );
  ring.rotation.set(
    motion.tilt[0] * (1 - progress),
    motion.tilt[1] * (1 - progress),
    motion.tilt[2] * (1 - progress),
  );
  ring.scale.setScalar(ENTRANCE_START_SCALE + progress * (1 - ENTRANCE_START_SCALE));
}

function entranceStartPosition(targetY: number, motion: EntranceMotion): [number, number, number] {
  return [motion.start[0], targetY + motion.start[1], motion.start[2]];
}

function explodedProgress(seconds: number) {
  const phase = seconds % EXPLODED_CYCLE_SECONDS;
  const ease = (value: number) => {
    const bounded = MathUtils.clamp(value, 0, 1);
    return bounded * bounded * (3 - 2 * bounded);
  };

  if (phase < 10) return 0;
  if (phase < 12) return ease((phase - 10) / 2);
  if (phase < 15) return 1;
  if (phase < 17) return 1 - ease((phase - 15) / 2);
  return 0;
}

function BangleSet({
  active,
  onIntroStart,
  onIntroComplete,
  onReady,
}: {
  active: boolean;
  onIntroStart: () => void;
  onIntroComplete: () => void;
  onReady: () => void;
}) {
  const { size } = useThree();
  const stack = useRef<Group | null>(null);
  const outerTop = useRef<Group | null>(null);
  const spacerTop = useRef<Group | null>(null);
  const centre = useRef<Group | null>(null);
  const spacerBottom = useRef<Group | null>(null);
  const outerBottom = useRef<Group | null>(null);
  const elapsed = useRef(0);
  const introStarted = useRef(false);
  const copyRevealed = useRef(false);
  const aspectRatio = size.width / Math.max(size.height, 1);
  const horizontalSettle = MathUtils.smoothstep(aspectRatio, 0.76, 1.28);
  const openingScale = MathUtils.lerp(
    OPENING_SCALE_PORTRAIT,
    OPENING_SCALE_LANDSCAPE,
    horizontalSettle,
  );
  const portraitRestingScale = MathUtils.lerp(
    COMPACT_RESTING_SCALE_PORTRAIT,
    RESTING_SCALE_PORTRAIT,
    MathUtils.smoothstep(size.height, 550, 770),
  );
  const restingScale = MathUtils.lerp(
    portraitRestingScale,
    RESTING_SCALE_LANDSCAPE,
    horizontalSettle,
  );
  const restingX = RESTING_X_LANDSCAPE * horizontalSettle;
  const restingY = RESTING_Y_PORTRAIT * (1 - horizontalSettle);

  useEffect(() => onReady(), [onReady]);

  useFrame((_, delta) => {
    if (!active) return;

    if (!introStarted.current) {
      introStarted.current = true;
      onIntroStart();
    }

    const stableDelta = Math.min(delta, 1 / 20);
    elapsed.current += stableDelta;
    const flightProgress = MathUtils.smoothstep(elapsed.current, 0, INTRO_SECONDS);
    const showcaseTime = Math.max(0, elapsed.current - INTRO_SECONDS);
    const separation = explodedProgress(showcaseTime);

    if (stack.current) {
      stack.current.position.x = MathUtils.lerp(0, restingX, flightProgress);
      stack.current.position.y =
        MathUtils.lerp(0, restingY, flightProgress) +
        Math.sin((showcaseTime * Math.PI * 2) / 14) * 0.008;
      stack.current.scale.setScalar(MathUtils.lerp(openingScale, restingScale, flightProgress));
      stack.current.rotation.y =
        -0.22 * (1 - flightProgress) + (showcaseTime * Math.PI * 2) / BANGLE_ROTATION_SECONDS;
      stack.current.rotation.x = 0.035 + Math.sin((showcaseTime * Math.PI * 2) / 18) * 0.004;
    }

    if (outerTop.current) {
      animateRingEntrance(
        outerTop.current,
        OUTER_RING_Y,
        RING_ENTRANCE.outerTop,
        elapsed.current,
        separation * OUTER_EXPLODE_DISTANCE,
      );
    }
    if (spacerTop.current) {
      animateRingEntrance(
        spacerTop.current,
        SPACER_RING_Y,
        RING_ENTRANCE.spacerTop,
        elapsed.current,
        separation * SPACER_EXPLODE_DISTANCE,
      );
    }
    if (centre.current) {
      animateRingEntrance(centre.current, 0, RING_ENTRANCE.centre, elapsed.current, 0);
    }
    if (spacerBottom.current) {
      animateRingEntrance(
        spacerBottom.current,
        -SPACER_RING_Y,
        RING_ENTRANCE.spacerBottom,
        elapsed.current,
        -separation * SPACER_EXPLODE_DISTANCE,
      );
    }
    if (outerBottom.current) {
      animateRingEntrance(
        outerBottom.current,
        -OUTER_RING_Y,
        RING_ENTRANCE.outerBottom,
        elapsed.current,
        -separation * OUTER_EXPLODE_DISTANCE,
      );
    }

    if (elapsed.current >= COPY_REVEAL_SECONDS && !copyRevealed.current) {
      copyRevealed.current = true;
      onIntroComplete();
    }
  });

  return (
    <>
      <hemisphereLight args={["#fff9f0", "#45101f", 1.3]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        intensity={2.5}
        position={[-3.8, 4.2, 4.6]}
        shadow-mapSize-height={768}
        shadow-mapSize-width={768}
      />
      <pointLight color="#fff3e3" intensity={17} position={[2.8, 2.1, 3.2]} />
      <pointLight color="#b33451" intensity={7} position={[-3.2, 0.1, -2.4]} />

      <group ref={stack} scale={openingScale}>
        <group
          ref={outerTop}
          position={entranceStartPosition(OUTER_RING_Y, RING_ENTRANCE.outerTop)}
          rotation={RING_ENTRANCE.outerTop.tilt}
          scale={ENTRANCE_START_SCALE}
        >
          <OrnamentedOuterRing profile={OUTER_RING_PROFILE} />
        </group>
        <group
          ref={spacerTop}
          position={entranceStartPosition(SPACER_RING_Y, RING_ENTRANCE.spacerTop)}
          rotation={RING_ENTRANCE.spacerTop.tilt}
          scale={ENTRANCE_START_SCALE}
        >
          <SmoothSpacerRing profile={SPACER_RING_PROFILE} />
        </group>
        <group
          ref={centre}
          position={entranceStartPosition(0, RING_ENTRANCE.centre)}
          rotation={RING_ENTRANCE.centre.tilt}
          scale={ENTRANCE_START_SCALE}
        >
          <CentreBraid />
        </group>
        <group
          ref={spacerBottom}
          position={entranceStartPosition(-SPACER_RING_Y, RING_ENTRANCE.spacerBottom)}
          rotation={RING_ENTRANCE.spacerBottom.tilt}
          scale={ENTRANCE_START_SCALE}
        >
          <SmoothSpacerRing profile={SPACER_RING_PROFILE} />
        </group>
        <group
          ref={outerBottom}
          position={entranceStartPosition(-OUTER_RING_Y, RING_ENTRANCE.outerBottom)}
          rotation={RING_ENTRANCE.outerBottom.tilt}
          scale={ENTRANCE_START_SCALE}
        >
          <OrnamentedOuterRing profile={OUTER_RING_PROFILE} />
        </group>
      </group>
    </>
  );
}

export function BangleScene({
  active,
  onIntroStart,
  onIntroComplete,
  onReady,
}: {
  active: boolean;
  onIntroStart: () => void;
  onIntroComplete: () => void;
  onReady: () => void;
}) {
  return (
    <Canvas
      camera={{ fov: 31, position: [2.9, 2.05, 5.2] }}
      dpr={[1, 1.25]}
      frameloop={active ? "always" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      shadows
    >
      <BangleSet
        active={active}
        onIntroStart={onIntroStart}
        onIntroComplete={onIntroComplete}
        onReady={onReady}
      />
    </Canvas>
  );
}
