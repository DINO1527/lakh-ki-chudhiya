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
  heroIntroDuration,
  heroRingSpacing,
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
const MODEL_SEGMENTS = 256;
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
  const scale = Math.max(0.5, Math.min(1.82, stageWorldWidth / 2.25, stageWorldHeight / 2.3));

  return { center, scale, worldWidth, worldHeight };
}

type RingRef = { current: Group | null };

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

function animateRing(ringRef: RingRef, index: number, time: number) {
  const ring = ringRef.current;
  if (!ring) return;
  // Shared parallel planes preserve clearance through the whole breathing cycle.
  const slot = 2 - index;
  ring.position.set(slot * 0.018, slot * heroRingSpacing(time), 0);
  ring.rotation.set(0, time * 0.1 + index * 0.16, 0);
  ring.scale.setScalar(1);
}

type RingProfile = { radial: number; vertical: number };

function makeRoundedBandGeometry(majorRadius: number, profile: RingProfile) {
  const ringSegments = 192;
  const crossSegments = 24;
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
  const { camera: activeCamera, size, gl } = useThree();
  const camera = activeCamera as PerspectiveCamera;
  const stack = useRef<Group | null>(null);
  const outerTop = useRef<Group | null>(null);
  const spacerTop = useRef<Group | null>(null);
  const centre = useRef<Group | null>(null);
  const spacerBottom = useRef<Group | null>(null);
  const outerBottom = useRef<Group | null>(null);
  const elapsed = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!active || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const move = (event: PointerEvent) => {
      const bounds = gl.domElement.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        pointer.current = { x: 0, y: 0 };
        return;
      }
      pointer.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.current.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    };
    const reset = () => {
      pointer.current = { x: 0, y: 0 };
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, [active, gl]);
  const introStarted = useRef(false);
  const introCompleted = useRef(false);
  const duration = heroIntroDuration(layout.mode);
  const frame = useMemo(
    () => getSceneFrame(camera, size.width, size.height, layout),
    [camera, layout, size.height, size.width],
  );
  const motion = useMemo(() => createHeroRingMotion(layout), [layout]);
  useEffect(() => onReady(), [onReady]);

  useEffect(() => {
    if (animateIntro) return;

    elapsed.current = duration;
    introCompleted.current = true;
    setDockedRing(outerTop, new Vector3(0, motion.outerTop.dockY, 0));
    setDockedRing(spacerTop, new Vector3(0, motion.spacerTop.dockY, 0));
    setDockedRing(centre, new Vector3(0, motion.centre.dockY, 0));
    setDockedRing(spacerBottom, new Vector3(0, motion.spacerBottom.dockY, 0));
    setDockedRing(outerBottom, new Vector3(0, motion.outerBottom.dockY, 0));
    onForegroundSafe(layout.foregroundSafe);
  }, [animateIntro, duration, layout.foregroundSafe, onForegroundSafe, motion]);

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
      stack.current.scale.setScalar(
        frame.scale * MathUtils.lerp(0.78, 1, MathUtils.smootherstep(progress, 0, 0.8)),
      );
      const settled = MathUtils.smootherstep(progress, 0.75, 1);
      stack.current.position.y += Math.sin(showcaseTime * 0.7) * 0.07 * settled;
      stack.current.rotation.y = MathUtils.damp(
        stack.current.rotation.y,
        -0.22 * (1 - settled) +
          (pointer.current.x * 0.34 + Math.sin(showcaseTime * 0.3) * 0.1) * settled,
        4,
        delta,
      );
      stack.current.rotation.z = -0.16 + Math.sin(showcaseTime * 0.38) * 0.035 * settled;
      stack.current.rotation.x = MathUtils.damp(
        stack.current.rotation.x,
        0.08 + pointer.current.y * 0.2 * settled,
        4,
        delta,
      );
    }

    [outerTop, spacerTop, centre, spacerBottom, outerBottom].forEach((ring, index) => {
      animateRing(ring, index, showcaseTime);
    });

    if (progress >= 1 && !introCompleted.current) {
      introCompleted.current = true;
      onIntroComplete();
      onForegroundSafe(layout.foregroundSafe);
    }
  });

  return (
    <>
      <hemisphereLight args={["#fff9f0", "#45101f", 1.3]} />
      <ambientLight intensity={0.3} />
      <spotLight
        color="#fff9f0"
        intensity={34}
        position={[0, 4, 4]}
        angle={0.65}
        penumbra={1}
        distance={14}
      />
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
        <group ref={outerTop} position={[0, motion.outerTop.dockY, 0]} rotation={[0, 0, 0]}>
          <OrnamentedOuterRing profile={OUTER_RING_PROFILE} />
        </group>
        <group ref={spacerTop} position={[0, motion.spacerTop.dockY, 0]} rotation={[0, 0, 0]}>
          <SmoothSpacerRing profile={SPACER_RING_PROFILE} />
        </group>
        <group ref={centre} position={[0, motion.centre.dockY, 0]} rotation={[0, 0, 0]}>
          <CentreBraid />
        </group>
        <group ref={spacerBottom} position={[0, motion.spacerBottom.dockY, 0]} rotation={[0, 0, 0]}>
          <SmoothSpacerRing profile={SPACER_RING_PROFILE} />
        </group>
        <group ref={outerBottom} position={[0, motion.outerBottom.dockY, 0]} rotation={[0, 0, 0]}>
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
      frameloop={active ? "always" : "demand"}
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
