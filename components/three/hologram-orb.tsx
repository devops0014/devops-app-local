"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Orb({ active = true }: { active?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * (active ? 0.32 : 0.09);
    if (core.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * (active ? 2.6 : 1.2)) * 0.035;
      core.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.5} floatIntensity={0.24} rotationIntensity={0.12}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.05, 3]} />
          <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.72} metalness={0.72} roughness={0.15} wireframe />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.44, 0.035, 10, 120]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.72} />
        </mesh>
        <mesh rotation={[Math.PI / 2.7, 0.35, 0]}>
          <torusGeometry args={[1.7, 0.018, 8, 120]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.42} />
        </mesh>
        <pointLight color="#8b5cf6" intensity={8} distance={6} />
        <pointLight color="#22d3ee" intensity={5} distance={5} position={[1.5, 0, 1.5]} />
      </Float>
      <Sparkles count={34} scale={4.5} size={2} speed={0.32} opacity={0.6} color="#a78bfa" />
    </group>
  );
}

export function HologramOrb({ active = true, className = "" }: { active?: boolean; className?: string }) {
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
  if (!mounted || !supported) return <div className={`hologram-fallback ${className}`} />;
  return (
    <div className={className}>
      <Canvas dpr={[1, 1.4]} camera={{ position: [0, 0, 5.2], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.28} />
        <Orb active={active} />
      </Canvas>
    </div>
  );
}
