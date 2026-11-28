"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  MathUtils,
  type Group,
  type PerspectiveCamera,
  TubeGeometry,
  Vector3,
} from "three";
import { LACORA_BANGLE_PALETTE } from "./bangle-palette";
import {
  createHeroRingMotion,
  HERO_RING_ORDER,
  heroIntroDuration,
  type HeroRingId,
} from "../domain/hero-motion";
import type { HeroLayout } from "../domain/hero-layout";

const OUTER_RADIUS = 0.82;
const OUTER_RING_PROFILE = { radial: 0.06, vertical: 0.046 };
const SPACER_RING_PROFILE = { radial: 0.055, vertical: 0.045 };
const CENTRE_RING_PROFILE = { radial: 0.085, vertical: 0.058 };
const BRAID_PROFILE = {
  weaveDepth: 0.005,
  strandDepth: 0.009,
  strandWidth: 0.0145,
  surfaceLift: 0.0015,
  majorRadius: OUTER_RADIUS - CENTRE_RING_PROFILE.radial - 0.012,
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
const RING_START_TILT: Record<HeroRingId, [number, number, number]> = {
  outerTop: [-0.32, 0.2, 0.48],
  spacerTop: [0.3, -0.32, -0.38],
  centre: [0.4, 0.15, 0.62],
  spacerBottom: [-0.28, 0.24, -0.42],
  outerBottom: [0.36, -0.2, 0.45],
};
const SHOWCASE_CYCLE_SECONDS = 8;

type SceneFrame = { center: Vector3; scale: number; worldWidth: number; worldHeight: number };

function getSceneFrame(
  camera: PerspectiveCamera,
  width: number,
  height: number,
  layout: HeroLayout,
): SceneFrame {
  camera.updateMatrixWorld(true);
  const distance = camera.position.length();
  const worldHeight = 2 * distance * Math.tan((31 * Math.PI) / 360);
  const worldWidth = worldHeight * (width / Math.max(height, 1));
  const stageCenter = {
    x: (layout.stage.x + layout.stage.width / 2) / Math.max(layout.width, 1),
    y: (layout.stage.y + layout.stage.height / 2) / Math.max(layout.height, 1),
  };
  const center = camera.localToWorld(
    new Vector3(
      (stageCenter.x * 2 - 1) * worldWidth * 0.5,
      (1 - stageCenter.y * 2) * worldHeight * 0.5,
      -distance,
    ),
  );
  const stageWorldWidth = (layout.stage.width / Math.max(layout.width, 1)) * worldWidth;
  const stageWorldHeight = (layout.stage.height / Math.max(layout.height, 1)) * worldHeight;
  const scale = Math.max(0.5, Math.min(1.82, stageWorldWidth / 2.15, stageWorldHeight / 1.85));

  return { center, scale, worldWidth, worldHeight };
}

function localScreenPoint(
  point: { x: number; y: number },
  frame: SceneFrame,
  camera: PerspectiveCamera,
) {
  const distance = camera.position.length();
  const world = camera.localToWorld(
    new Vector3(
      (point.x * 2 - 1) * frame.worldWidth * 0.5,
      (1 - point.y * 2) * frame.worldHeight * 0.5,
      -distance,
    ),
  );
  return world.sub(frame.center).divideScalar(frame.scale);
}

type RingRef = { current: Group | null };
type RingVectors = { start: Vector3; path: CatmullRomCurve3; target: Vector3 };

function WebGLContextGuard({ onContextLost }: { onContextLost: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => canvas.removeEventListener("webglcontextlost", handleContextLost);
  }, [gl, onContextLost]);

  return null;
}

function setDockedRing(ringRef: RingRef, target: Vector3) {
  const ring = ringRef.current;
  if (!ring) return;
  ring.position.copy(target);
  ring.rotation.set(0, 0, 0);
  ring.scale.setScalar(1);
}

function animateRing(
  ringRef: RingRef,
  index: number,
  progress: number,
  showcaseTime: number,
  eject: number,
  stacked: boolean,
  choreography: ReturnType<typeof createHeroRingMotion>[HeroRingId],
  vectors: RingVectors,
) {
  const ring = ringRef.current;
  if (!ring) return;

  const local = MathUtils.clamp((progress - index * 0.038) / 0.84, 0, 1);
  // Keep drifting through the highlight between the two faster sections.
  const flight =
    0.16 * local +
    0.28 * MathUtils.smootherstep(local, 0, 0.3) +
    0.56 * MathUtils.smootherstep(local, 0.47, 1);
  const level = MathUtils.smootherstep(flight, 0.63, 1);
  const dock = MathUtils.smootherstep(
    progress,
    0.76 + choreography.dockStart * 0.12,
    0.84 + choreography.dockEnd * 0.16,
  );
  const slot = 2 - index;
  vectors.path.getPointAt(flight, ring.position);
  ring.position.lerp(vectors.target, level);
  ring.position.y += slot * level * (0.16 * (1 - dock) + 0.032 * eject);
  const spinSign = index % 2 === 0 ? 1 : -1;
  const spin = spinSign * (flight * Math.PI * 1.7 + showcaseTime * 0.23);
  const bank = Math.sin(2 * Math.PI * flight);
  ring.rotation.set(
    (1 - level) * (0.24 + Math.sin(Math.PI * flight) * (stacked ? 0.44 : 0.78)),
    spin,
    (1 - level) * (0.36 - bank * 0.8),
    "ZXY",
  );
  ring.scale.setScalar(
    MathUtils.lerp(stacked ? 0.36 : 0.46, 1, MathUtils.smootherstep(progress, 0.51, 0.92)),
  );
}

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
  const majorRadius = OUTER_RADIUS - profile.radial;
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
  const majorRadius = OUTER_RADIUS - profile.radial;
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

function BangleSet({
  active,
  animateIntro,
  layout,
  onIntroStart,
  onIntroComplete,
  onForegroundSafe,
  onReady,
}: {
  active: boolean;
  animateIntro: boolean;
  layout: HeroLayout;
  onIntroStart: () => void;
  onIntroComplete: () => void;
  onForegroundSafe: (safe: boolean) => void;
  onReady: () => void;
}) {
  const { camera: activeCamera, size } = useThree();
  const camera = activeCamera as PerspectiveCamera;
  const stack = useRef<Group | null>(null);
  const outerTop = useRef<Group | null>(null);
  const spacerTop = useRef<Group | null>(null);
  const centre = useRef<Group | null>(null);
  const spacerBottom = useRef<Group | null>(null);
  const outerBottom = useRef<Group | null>(null);
  const elapsed = useRef(0);
  const introStarted = useRef(false);
  const introCompleted = useRef(false);
  const duration = heroIntroDuration(layout.mode);
  const frame = useMemo(
    () => getSceneFrame(camera, size.width, size.height, layout),
    [camera, layout, size.height, size.width],
  );
  const motion = useMemo(() => createHeroRingMotion(layout), [layout]);
  const vectors = useMemo(() => {
    const stagePoint = (x: number, y: number) =>
      localScreenPoint(
        {
          x: (layout.stage.x + x * layout.stage.width) / layout.width,
          y: (layout.stage.y + y * layout.stage.height) / layout.height,
        },
        frame,
        camera,
      );
    return Object.fromEntries(
      HERO_RING_ORDER.map((id, index) => {
        const start = localScreenPoint(motion[id].start, frame, camera);
        const target = new Vector3(0, motion[id].dockY, 0);
        // Separate the trails in depth and height as the camera sees their specular faces.
        const lane = (index - 2) * 0.055;
        const nearTurn = stagePoint(0.73 - lane * 0.25, 0.66 + lane);
        nearTurn.addScaledVector(camera.position.clone().normalize(), 0.38 - lane);
        const path = new CatmullRomCurve3([
          start,
          stagePoint(layout.mode === "stacked" ? 0.36 : -0.22, 0.26 + lane),
          stagePoint(0.48, 0.5 + lane),
          nearTurn,
          stagePoint(0.82, 0.49 + lane),
          stagePoint(0.72, 0.27 + lane),
          stagePoint(0.52, 0.24 + lane),
          localScreenPoint(motion[id].fan, frame, camera),
        ]);
        return [id, { start, target, path }];
      }),
    ) as Record<HeroRingId, RingVectors>;
  }, [camera, frame, layout, motion]);

  useEffect(() => onReady(), [onReady]);

  useEffect(() => {
    if (animateIntro) return;

    elapsed.current = duration;
    introCompleted.current = true;
    setDockedRing(outerTop, vectors.outerTop.target);
    setDockedRing(spacerTop, vectors.spacerTop.target);
    setDockedRing(centre, vectors.centre.target);
    setDockedRing(spacerBottom, vectors.spacerBottom.target);
    setDockedRing(outerBottom, vectors.outerBottom.target);
    onForegroundSafe(layout.foregroundSafe);
  }, [animateIntro, duration, layout.foregroundSafe, onForegroundSafe, vectors]);

  useFrame((state, delta) => {
    if (!active) return;

    if (!animateIntro) {
      elapsed.current = Math.max(duration, elapsed.current) + Math.min(delta, 1 / 20);
    } else {
      elapsed.current += Math.min(delta, 1 / 20);
    }

    if (animateIntro && !introStarted.current) {
      introStarted.current = true;
      onIntroStart();
    }

    const progress = MathUtils.clamp(elapsed.current / duration, 0, 1);
    const showcaseTime = Math.max(0, elapsed.current - duration);

    const cameraSweep = Math.sin(Math.PI * MathUtils.smootherstep(progress, 0, 0.87));
    const focusFov = 31 - 2.8 * cameraSweep;
    const animatedCamera = state.camera as PerspectiveCamera;
    if (animatedCamera.fov !== focusFov) {
      animatedCamera.filmOffset = -0.65 * cameraSweep;
      animatedCamera.fov = focusFov;
      animatedCamera.updateProjectionMatrix();
    }

    if (stack.current) {
      stack.current.position.copy(frame.center);
      stack.current.scale.setScalar(frame.scale);
      stack.current.rotation.y = -0.22 * (1 - MathUtils.smoothstep(progress, 0.3, 1));
      stack.current.rotation.z = -0.16 * (1 - MathUtils.smootherstep(progress, 0.35, 0.8));
      stack.current.rotation.x = 0.035 + Math.sin((showcaseTime * Math.PI * 2) / 18) * 0.004;
    }

    const idlePhase = (showcaseTime % SHOWCASE_CYCLE_SECONDS) / SHOWCASE_CYCLE_SECONDS;
    const eject = (1 - Math.cos(idlePhase * Math.PI * 2)) * 0.5;
    animateRing(
      outerTop,
      0,
      progress,
      showcaseTime,
      eject,
      layout.mode === "stacked",
      motion.outerTop,
      vectors.outerTop,
    );
    animateRing(
      spacerTop,
      1,
      progress,
      showcaseTime,
      eject,
      layout.mode === "stacked",
      motion.spacerTop,
      vectors.spacerTop,
    );
    animateRing(
      centre,
      2,
      progress,
      showcaseTime,
      eject,
      layout.mode === "stacked",
      motion.centre,
      vectors.centre,
    );
    animateRing(
      spacerBottom,
      3,
      progress,
      showcaseTime,
      eject,
      layout.mode === "stacked",
      motion.spacerBottom,
      vectors.spacerBottom,
    );
    animateRing(
      outerBottom,
      4,
      progress,
      showcaseTime,
      eject,
      layout.mode === "stacked",
      motion.outerBottom,
      vectors.outerBottom,
    );

    if (progress >= 1 && !introCompleted.current) {
      introCompleted.current = true;
      onIntroComplete();
      onForegroundSafe(layout.foregroundSafe);
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
      <pointLight color="#ffe4bc" intensity={19} position={[2.8, 2.1, 3.2]} />
      <pointLight color="#b33451" intensity={7} position={[-3.2, 0.1, -2.4]} />

      <group ref={stack} position={frame.center.toArray()} scale={frame.scale}>
        <group
          ref={outerTop}
          position={animateIntro ? vectors.outerTop.start.toArray() : [0, motion.outerTop.dockY, 0]}
          rotation={animateIntro ? RING_START_TILT.outerTop : [0, 0, 0]}
        >
          <OrnamentedOuterRing profile={OUTER_RING_PROFILE} />
        </group>
        <group
          ref={spacerTop}
          position={
            animateIntro ? vectors.spacerTop.start.toArray() : [0, motion.spacerTop.dockY, 0]
          }
          rotation={animateIntro ? RING_START_TILT.spacerTop : [0, 0, 0]}
        >
          <SmoothSpacerRing profile={SPACER_RING_PROFILE} />
        </group>
        <group
          ref={centre}
          position={animateIntro ? vectors.centre.start.toArray() : [0, motion.centre.dockY, 0]}
          rotation={animateIntro ? RING_START_TILT.centre : [0, 0, 0]}
        >
          <CentreBraid />
        </group>
        <group
          ref={spacerBottom}
          position={
            animateIntro ? vectors.spacerBottom.start.toArray() : [0, motion.spacerBottom.dockY, 0]
          }
          rotation={animateIntro ? RING_START_TILT.spacerBottom : [0, 0, 0]}
        >
          <SmoothSpacerRing profile={SPACER_RING_PROFILE} />
        </group>
        <group
          ref={outerBottom}
          position={
            animateIntro ? vectors.outerBottom.start.toArray() : [0, motion.outerBottom.dockY, 0]
          }
          rotation={animateIntro ? RING_START_TILT.outerBottom : [0, 0, 0]}
        >
          <OrnamentedOuterRing profile={OUTER_RING_PROFILE} />
        </group>
      </group>
    </>
  );
}

export function BangleScene({
  active,
  animateIntro,
  layout,
  onIntroStart,
  onIntroComplete,
  onForegroundSafe,
  onContextLost,
  onReady,
}: {
  active: boolean;
  animateIntro: boolean;
  layout: HeroLayout;
  onIntroStart: () => void;
  onIntroComplete: () => void;
  onForegroundSafe: (safe: boolean) => void;
  onContextLost: () => void;
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
      <WebGLContextGuard onContextLost={onContextLost} />
      <BangleSet
        active={active}
        animateIntro={animateIntro}
        layout={layout}
        onIntroStart={onIntroStart}
        onIntroComplete={onIntroComplete}
        onForegroundSafe={onForegroundSafe}
        onReady={onReady}
      />
    </Canvas>
  );
}
