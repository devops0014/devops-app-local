"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Float, Line, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { categories } from "@/lib/data";

const positions: [number, number, number][] = [
  [-4.6, 1.6, 0], [-2.3, 2.1, -1], [0, 1.45, 0], [2.35, 2, -1], [4.6, 1.4, 0],
  [-4.4, -1.5, -1], [-2.15, -1.8, 0], [0.15, -1.35, -1], [2.4, -1.7, 0], [4.55, -1.3, -1],
];

function CategoryObject({
  index,
  active,
  onSelect,
}: {
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const category = categories[index];
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (active ? 0.85 : 0.22);
    const target = active ? 1.22 : 1;
    group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.07);
    group.current.position.y = positions[index][1] + Math.sin(state.clock.elapsedTime + index) * 0.08;
  });
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect();
  };
  return (
    <group ref={group} position={positions[index]} onClick={click}>
      <Float speed={1 + (index % 3) * 0.2} floatIntensity={0.2}>
        {index % 4 === 0 ? (
          <mesh>
            <octahedronGeometry args={[0.52, 0]} />
            <meshStandardMaterial color={category.color} emissive={category.color} emissiveIntensity={active ? 1.2 : 0.35} metalness={0.82} roughness={0.2} />
          </mesh>
        ) : index % 4 === 1 ? (
          <mesh>
            <torusKnotGeometry args={[0.34, 0.1, 64, 10]} />
            <meshStandardMaterial color={category.color} emissive={category.color} emissiveIntensity={active ? 1.1 : 0.3} metalness={0.72} roughness={0.22} />
          </mesh>
        ) : index % 4 === 2 ? (
          <group>
            {[-0.28, 0.28].map((x) => [-0.28, 0.28].map((y) => (
              <mesh key={`${x}-${y}`} position={[x, y, 0]}>
                <boxGeometry args={[0.42, 0.42, 0.42]} />
                <meshStandardMaterial color={category.color} emissive={category.color} emissiveIntensity={active ? 0.9 : 0.22} metalness={0.65} roughness={0.24} />
              </mesh>
            )))}
          </group>
        ) : (
          <mesh>
            <icosahedronGeometry args={[0.52, 1]} />
            <meshStandardMaterial color={category.color} emissive={category.color} emissiveIntensity={active ? 1 : 0.3} wireframe />
          </mesh>
        )}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.75, active ? 0.025 : 0.012, 8, 64]} />
          <meshBasicMaterial color={category.color} transparent opacity={active ? 0.85 : 0.25} />
        </mesh>
        <pointLight color={category.color} intensity={active ? 5 : 1} distance={2.5} />
      </Float>
    </group>
  );
}

function Universe({
  activeSlug,
  onSelect,
}: {
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  useFrame(({ camera }) => {
    const index = categories.findIndex((item) => item.slug === activeSlug);
    const targetX = index >= 0 ? positions[index][0] * 0.2 : 0;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.lookAt(camera.position.x * 0.45, 0, 0);
  });
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 4, 5]} intensity={2.4} color="#d8b4fe" />
      <pointLight position={[0, 0, 3]} intensity={5} color="#22d3ee" />
      <Line points={[[-5.3, 0, -1.5], [0, 0, -2], [5.3, 0, -1.5]]} color="#6d28d9" transparent opacity={0.18} />
      {categories.map((category, index) => (
        <CategoryObject key={category.slug} index={index} active={activeSlug === category.slug} onSelect={() => onSelect(category.slug)} />
      ))}
      <Sparkles count={80} scale={[12, 5, 4]} size={1.4} speed={0.2} opacity={0.45} color="#a78bfa" />
    </>
  );
}

export function CategoryUniverse({
  activeSlug,
  onSelect,
}: {
  activeSlug: string | null;
  onSelect: (slug: string) => void;
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
  if (!mounted || !supported) return <div className="workflow-fallback h-full"><div className="fallback-orbit"><span /><span /><span /></div></div>;
  return (
    <Canvas dpr={[1, 1.35]} camera={{ position: [0, 0, 10.4], fov: 46 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
      <Universe activeSlug={activeSlug} onSelect={onSelect} />
    </Canvas>
  );
}
