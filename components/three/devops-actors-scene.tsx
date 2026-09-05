"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import { DevOpsModel, type DevOpsModelId } from "./devops-models";

type ActorDefinition = {
  id: DevOpsModelId;
  label: string;
  color: string;
  scale: number;
  motion: "hover" | "drift" | "pulse" | "step" | "sail" | "roll" | "assemble";
};

const actors: ActorDefinition[] = [
  { id: "jenkins", label: "Jenkins", color: "#d44135", scale: .36, motion: "step" },
  { id: "docker", label: "Docker", color: "#2496ed", scale: .35, motion: "sail" },
  { id: "kubernetes", label: "Kubernetes", color: "#326ce5", scale: .34, motion: "roll" },
  { id: "terraform", label: "Terraform", color: "#844fba", scale: .46, motion: "assemble" },
  { id: "aws", label: "AWS", color: "#ff9900", scale: .39, motion: "drift" },
  { id: "ansible", label: "Ansible", color: "#ef4444", scale: .38, motion: "assemble" },
  { id: "git", label: "Git", color: "#f05032", scale: .35, motion: "roll" },
  { id: "linux", label: "Linux", color: "#facc15", scale: .36, motion: "hover" },
  { id: "azure", label: "Azure", color: "#00a4ef", scale: .4, motion: "drift" },
  { id: "grafana", label: "Grafana", color: "#f46800", scale: .38, motion: "pulse" },
];

const logoOrder = actors.map(({ id }) => id);

function slotsAt(step: number) {
  const slots = logoOrder.slice(0, 4);
  for (let replacement = 0; replacement < step; replacement += 1) {
    slots[replacement % 4] = logoOrder[(replacement + 4) % logoOrder.length];
  }
  return slots;
}

function slotPosition(slot: number, mobile: boolean): [number, number, number] {
  const x = mobile ? 1.12 : 1.68;
  const y = mobile ? (slot < 2 ? 1.35 : .9) : 1.12;
  const mobileLift = mobile ? .5 : 0;
  return [slot % 2 === 0 ? -x : x, (slot < 2 ? y : -y) + mobileLift, slot % 2 === 0 ? -.1 : 0];
}

function GlassHalo({ color, active }: { color: string; active: boolean }) {
  return (
    <group position={[0, 0, -.48]}>
      <mesh>
        <circleGeometry args={[.7, 64]} />
        <meshPhysicalMaterial
          color="#11111a"
          emissive={color}
          emissiveIntensity={active ? .18 : .06}
          metalness={.55}
          roughness={.23}
          transparent
          opacity={.5}
          transmission={.1}
        />
      </mesh>
      <mesh position={[0, 0, .02]}>
        <ringGeometry args={[.69, .72, 64]} />
        <meshBasicMaterial color={color} transparent opacity={active ? .7 : .28} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -.73, .1]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.32, .61, 64]} />
        <meshBasicMaterial color={color} transparent opacity={active ? .25 : .1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Actor({ actor, index }: { actor: ActorDefinition; index: number }) {
  const rig = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useFrame((state, delta) => {
    if (!rig.current) return;
    const t = state.clock.elapsedTime + index * .82;
    const interval = 4.5;
    const step = Math.floor(state.clock.elapsedTime / interval);
    const stepTime = state.clock.elapsedTime % interval;
    const transition = THREE.MathUtils.smoothstep(stepTime, 2.9, 4.35);
    const currentSlots = slotsAt(step);
    const nextSlots = slotsAt(step + 1);
    const currentSlot = currentSlots.indexOf(actor.id);
    const nextSlot = nextSlots.indexOf(actor.id);
    const presence = currentSlot >= 0 && nextSlot < 0
      ? 1 - transition
      : currentSlot < 0 && nextSlot >= 0
        ? transition
        : currentSlot >= 0
          ? 1
          : 0;
    const slot = nextSlot >= 0 && transition > .5 ? nextSlot : currentSlot;
    rig.current.visible = presence > .001;
    if (label.current) {
      label.current.style.opacity = String(presence);
      label.current.style.visibility = presence > .01 ? "visible" : "hidden";
      label.current.style.pointerEvents = presence > .01 ? "auto" : "none";
    }
    const mobile = state.size.width / Math.max(state.size.height, 1) < .8;
    const basePosition = slotPosition(Math.max(slot, 0), mobile);
    let x = basePosition[0];
    let y = basePosition[1];
    const z = basePosition[2];
    let rotationY = 0;
    let rotationZ = 0;

    if (actor.motion === "hover") {
      y += Math.sin(t * 1.25) * .1;
      rotationY = Math.sin(t * .72) * .22;
    } else if (actor.motion === "drift") {
      x += Math.sin(t * .7) * .16;
      y += Math.cos(t * .95) * .07;
      rotationY = Math.sin(t * .5) * .18;
    } else if (actor.motion === "pulse") {
      y += Math.sin(t * 1.65) * .06;
      rotationY = t * .16;
    } else if (actor.motion === "step") {
      y += Math.abs(Math.sin(t * 2.1)) * .08;
      rotationY = Math.sin(t * .8) * .12;
    } else if (actor.motion === "sail") {
      x += Math.sin(t * .88) * .14;
      rotationZ = Math.sin(t * 1.5) * .04;
    } else if (actor.motion === "roll") {
      y += Math.sin(t * 1.4) * .05;
      rotationY = Math.sin(t * .68) * .18;
    } else {
      y += Math.sin(t * .9) * .08;
      rotationY = t * .22;
    }

    rig.current.position.x = THREE.MathUtils.damp(rig.current.position.x, x, 4, delta);
    rig.current.position.y = THREE.MathUtils.damp(rig.current.position.y, y, 4, delta);
    rig.current.position.z = THREE.MathUtils.damp(rig.current.position.z, active ? z + .55 : z, 5, delta);
    rig.current.rotation.y = THREE.MathUtils.damp(rig.current.rotation.y, active ? rotationY + Math.sin(t * 2.2) * .28 : rotationY, 4, delta);
    rig.current.rotation.z = THREE.MathUtils.damp(rig.current.rotation.z, active ? rotationZ + Math.sin(t * 2.5) * .06 : rotationZ, 4, delta);
    const exchangeLift = Math.sin(transition * Math.PI) * .28;
    y += exchangeLift;
    const targetScale = (active ? 1.14 : 1) * Math.max(presence, .001);
    rig.current.scale.setScalar(THREE.MathUtils.damp(rig.current.scale.x, targetScale, 6, delta));
  });

  return (
    <group
      ref={rig}
      position={slotPosition(index % 4, false)}
      onPointerEnter={(event) => {
        event.stopPropagation();
        setActive(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        setActive(false);
        document.body.style.cursor = "";
      }}
    >
      <GlassHalo color={actor.color} active={active} />
      <Float speed={.72 + index * .035} rotationIntensity={.035} floatIntensity={.08}>
        <group scale={actor.scale} position={[0, .05, .12]}>
          <DevOpsModel id={actor.id} />
        </group>
      </Float>
      <Html transform sprite center distanceFactor={8.5} position={[0, -.98, .05]}>
        <div ref={label} className="model-label hero-model-label" style={{ "--model-color": actor.color } as CSSProperties}>
          <span />
          {actor.label}
        </div>
      </Html>
      <pointLight color={actor.color} intensity={active ? 7 : 3.6} distance={3.2} position={[0, 0, .8]} />
    </group>
  );
}

function CameraRig() {
  useFrame((state, delta) => {
    const aspect = state.size.width / Math.max(state.size.height, 1);
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, state.pointer.x * .24, 3, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, state.pointer.y * .12, 3, delta);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, aspect < .8 ? 9.25 : aspect < 1.25 ? 8.15 : 7.55, 3, delta);
    state.camera.lookAt(0, -.02, 0);
  });
  return null;
}

function RotationReporter({ onVisibleChange }: { onVisibleChange?: (labels: string[], activeSlot: number) => void }) {
  const lastReported = useRef(-1);
  useFrame((state) => {
    if (!onVisibleChange) return;
    const interval = 4.5;
    const step = Math.floor(state.clock.elapsedTime / interval);
    const stepTime = state.clock.elapsedTime % interval;
    const displayedStep = stepTime >= 4.25 ? step + 1 : step;
    if (displayedStep === lastReported.current) return;
    lastReported.current = displayedStep;
    const labels = slotsAt(displayedStep).map((id) => actors.find((actor) => actor.id === id)?.label ?? id);
    onVisibleChange(labels, displayedStep === 0 ? 0 : (displayedStep - 1) % 4);
  });
  return null;
}

function Scene({ onVisibleChange }: { onVisibleChange?: (labels: string[], activeSlot: number) => void }) {
  return (
    <>
      <ambientLight intensity={.62} />
      <directionalLight position={[3, 5, 7]} intensity={2.5} color="#e9d5ff" />
      <directionalLight position={[-4, -2, 5]} intensity={1.35} color="#67e8f9" />
      <hemisphereLight args={["#b8c9ff", "#160d2d", 1.15]} />
      <Stars radius={44} depth={24} count={340} factor={1.65} saturation={.32} fade speed={.1} />
      <Sparkles count={38} scale={[8.5, 5.3, 3]} size={1.15} speed={.14} opacity={.28} color="#b197fc" />
      {actors.map((actor, index) => <Actor key={actor.id} actor={actor} index={index} />)}
      <RotationReporter onVisibleChange={onVisibleChange} />
      <CameraRig />
    </>
  );
}

function Fallback() {
  return (
    <div className="actor-fallback">
      <div className="fallback-orbit"><span /><span /><span /></div>
      <p>Interactive DevOps tools</p>
    </div>
  );
}

export function DevOpsActorsScene({
  className = "",
  onVisibleChange,
}: {
  className?: string;
  onVisibleChange?: (labels: string[], activeSlot: number) => void;
}) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const supported = useMemo(() => {
    if (!mounted) return false;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
      context?.getExtension("WEBGL_lose_context")?.loseContext();
      return Boolean(context);
    } catch {
      return false;
    }
  }, [mounted]);

  if (!mounted || !supported) return <div className={className}><Fallback /></div>;
  return (
    <div className={className} aria-label="Independent interactive 3D DevOps tools">
      <Canvas dpr={[1, 1.35]} camera={{ position: [0, 0, 8.8], fov: 45 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <Scene onVisibleChange={onVisibleChange} />
      </Canvas>
    </div>
  );
}
