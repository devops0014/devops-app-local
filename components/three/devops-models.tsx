"use client";

import { useMemo, useRef } from "react";
import { Line, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Metal({ color, glow = color, intensity = .3 }: { color: string; glow?: string; intensity?: number }) {
  return <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={intensity} metalness={.68} roughness={.2} />;
}

export function LinuxModel() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * .7) * .22; });
  return (
    <group ref={ref} scale={.9}>
      <mesh position={[0, -.15, 0]} scale={[.82, 1.08, .62]}><sphereGeometry args={[1, 32, 24]} /><Metal color="#111318" glow="#6d5dfc" intensity={.16} /></mesh>
      <mesh position={[0, .7, .02]} scale={[.63, .62, .58]}><sphereGeometry args={[1, 32, 24]} /><Metal color="#15181e" /></mesh>
      <mesh position={[0, -.15, .57]} scale={[.48, .7, .13]}><sphereGeometry args={[1, 24, 16]} /><Metal color="#f5f5f4" glow="#ffffff" intensity={.08} /></mesh>
      {[-.22, .22].map((x) => <mesh key={x} position={[x, .83, .54]}><sphereGeometry args={[.085, 18, 18]} /><meshStandardMaterial color="#e5e7eb" /></mesh>)}
      {[-.22, .22].map((x) => <mesh key={x} position={[x, .83, .62]}><sphereGeometry args={[.035, 14, 14]} /><meshBasicMaterial color="#050505" /></mesh>)}
      <mesh position={[0, .57, .67]} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, .7, 1]}><coneGeometry args={[.19, .44, 4]} /><Metal color="#f5b82e" glow="#f59e0b" intensity={.35} /></mesh>
      {[-.38, .38].map((x) => <mesh key={x} position={[x, -1.05, .18]} scale={[1.45, .5, .8]}><sphereGeometry args={[.28, 20, 14]} /><Metal color="#f5b82e" /></mesh>)}
    </group>
  );
}

export function GitModel() {
  return (
    <group rotation={[.15, -.15, Math.PI / 4]}>
      <RoundedBox args={[1.75, 1.75, .28]} radius={.18} smoothness={4}><Metal color="#f05032" glow="#ff4928" intensity={.55} /></RoundedBox>
      <group position={[0, 0, .19]} rotation={[0, 0, -Math.PI / 4]}>
        <Line points={[[-.44, .52, 0], [-.44, -.44, 0], [.4, -.44, 0]]} color="#fff" lineWidth={5} />
        <Line points={[[-.44, .04, 0], [.38, .52, 0]]} color="#fff" lineWidth={5} />
        {[[-.44, .52, .02], [-.44, -.44, .02], [.4, -.44, .02], [.38, .52, .02]].map((p, i) => <mesh key={i} position={p as [number,number,number]}><sphereGeometry args={[.13, 20, 20]} /><meshBasicMaterial color="#fff" /></mesh>)}
      </group>
    </group>
  );
}

export function JenkinsModel() {
  const tray = useRef<THREE.Group>(null);
  useFrame((s) => { if (tray.current) tray.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.4) * .045; });
  return (
    <group scale={.78}>
      <mesh position={[0, .64, 0]} scale={[.62, .72, .56]}><sphereGeometry args={[1, 32, 24]} /><Metal color="#f0c7a0" glow="#fff0df" intensity={.12} /></mesh>
      <mesh position={[0, 1.13, -.06]} scale={[.68, .22, .6]}><sphereGeometry args={[1, 24, 16]} /><Metal color="#6f352e" glow="#d64d3c" intensity={.16} /></mesh>
      <mesh position={[-.42, .79, .18]} rotation={[0,0,.22]}><capsuleGeometry args={[.12,.36,8,14]} /><Metal color="#6f352e" /></mesh>
      <mesh position={[.42, .79, .18]} rotation={[0,0,-.22]}><capsuleGeometry args={[.12,.36,8,14]} /><Metal color="#6f352e" /></mesh>
      <mesh position={[0, .48, .53]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.17,.38,4]} /><Metal color="#f0c7a0" /></mesh>
      <mesh position={[0, .22, .55]} scale={[.34,.08,.06]}><sphereGeometry args={[1,20,12]} /><Metal color="#6f352e" /></mesh>
      <RoundedBox position={[0, -.48, 0]} args={[1.18, 1.34, .64]} radius={.2} smoothness={4}><Metal color="#f4f5f7" glow="#ffffff" intensity={.09} /></RoundedBox>
      <mesh position={[-.33,-.33,.37]} rotation={[0,0,.72]}><coneGeometry args={[.24,.45,3]} /><Metal color="#d44135" glow="#ef4444" intensity={.28} /></mesh>
      <mesh position={[.33,-.33,.37]} rotation={[0,0,-.72]}><coneGeometry args={[.24,.45,3]} /><Metal color="#d44135" glow="#ef4444" intensity={.28} /></mesh>
      <RoundedBox position={[0,-.82,.36]} args={[.72,.5,.08]} radius={.08} smoothness={3}><Metal color="#1f2937" glow="#3b82f6" intensity={.1} /></RoundedBox>
      <group ref={tray} position={[.78,-.34,.15]}>
        <mesh position={[.35,0,0]} rotation={[0,0,Math.PI/2]}><capsuleGeometry args={[.1,.48,8,14]} /><Metal color="#f0c7a0" /></mesh>
        <mesh position={[.76,.04,.1]}><cylinderGeometry args={[.5,.5,.07,32]} /><Metal color="#cbd5e1" glow="#ffffff" intensity={.22} /></mesh>
        <mesh position={[.76,.18,.1]}><sphereGeometry args={[.25,20,16]} /><Metal color="#e5e7eb" glow="#ffffff" intensity={.12} /></mesh>
      </group>
    </group>
  );
}

export function DockerModel() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.5) * .025; });
  return (
    <group ref={ref}>
      <mesh position={[-.15,-.48,0]} scale={[1.48,.5,.64]}><sphereGeometry args={[1,32,18,0,Math.PI*2,0,Math.PI/2]} /><Metal color="#1688d4" glow="#2496ed" intensity={.52} /></mesh>
      <mesh position={[1.18,-.27,0]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[.36,.72,20]} /><Metal color="#1688d4" /></mesh>
      <mesh position={[1.38,.05,0]} rotation={[0,0,-.55]}><coneGeometry args={[.22,.72,16]} /><Metal color="#38bdf8" glow="#2496ed" intensity={.34} /></mesh>
      {[-.72,-.24,.24,.72].map((x,i) => [0,.37].map((y,j) => (
        <RoundedBox key={`${x}-${y}`} position={[x,y-.05,0]} args={[.4,.31,.52]} radius={.035} smoothness={2}><Metal color={i%2===j?"#42baf5":"#087fc4"} glow="#0ea5e9" intensity={.4} /></RoundedBox>
      )))}
      <RoundedBox position={[-.72,.68,0]} args={[.4,.31,.52]} radius={.035} smoothness={2}><Metal color="#42baf5" glow="#0ea5e9" intensity={.42} /></RoundedBox>
      <mesh position={[-1.28,-.22,.02]} rotation={[0,0,.45]}><coneGeometry args={[.26,.64,14]} /><Metal color="#2496ed" /></mesh>
    </group>
  );
}

export function KubernetesModel() {
  const wheel = useRef<THREE.Group>(null);
  const spokes = useMemo(() => Array.from({length:7},(_,i)=>i*Math.PI*2/7),[]);
  useFrame((_,d)=>{ if(wheel.current) wheel.current.rotation.z -= d*.65; });
  return (
    <group ref={wheel}>
      <mesh position={[0,0,-.2]}><cylinderGeometry args={[1.38,1.38,.2,7]} /><Metal color="#326ce5" glow="#326ce5" intensity={.5} /></mesh>
      <mesh position={[0,0,.02]}><cylinderGeometry args={[1.15,1.15,.22,7]} /><Metal color="#f5f8ff" glow="#c7d7ff" intensity={.12} /></mesh>
      <mesh position={[0,0,.2]}><cylinderGeometry args={[.3,.3,.32,7]} /><Metal color="#326ce5" glow="#60a5fa" intensity={.75} /></mesh>
      <mesh position={[0,0,.18]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.86,.11,18,80]} /><Metal color="#326ce5" glow="#38bdf8" intensity={.6} /></mesh>
      {spokes.map((a,i)=><group key={i} position={[0,0,.2]} rotation={[0,0,a]}><mesh position={[0,.5,0]}><boxGeometry args={[.12,.72,.16]} /><Metal color="#326ce5" glow="#326ce5" intensity={.52} /></mesh><mesh position={[0,.93,0]}><sphereGeometry args={[.15,18,18]} /><Metal color="#326ce5" /></mesh></group>)}
    </group>
  );
}

export function TerraformModel() {
  const ref = useRef<THREE.Group>(null);
  const blocks = [[-.48,.5,0],[.16,.14,0],[-.48,-.22,0],[.16,-.58,0]] as const;
  useFrame((s)=>{ if(ref.current) ref.current.rotation.y=Math.sin(s.clock.elapsedTime*.65)*.32; });
  return (
    <group ref={ref}>
      {blocks.map((p,i)=><mesh key={i} position={p} rotation={[0,0,-Math.PI/6]} scale={[.72,.54,.28]}><boxGeometry args={[1,1,1]} /><Metal color={i===1?"#9f7aea":"#7147c8"} glow="#8b5cf6" intensity={.72} /></mesh>)}
    </group>
  );
}

export function AwsModel() {
  return (
    <group>
      {[[-.7,-.08,0],[0,.28,0],[.68,-.05,0],[0,-.38,0]].map((p,i)=><mesh key={i} position={p as [number,number,number]} scale={[1.14,.8,.68]}><sphereGeometry args={[i===1?.66:.57,28,20]} /><Metal color="#ff9900" glow="#ff7a00" intensity={.5} /></mesh>)}
      <mesh position={[0,-.52,.56]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.76,.08,12,44,Math.PI]} /><Metal color="#fff7ed" glow="#ffffff" intensity={.3} /></mesh>
      <mesh position={[.76,-.47,.55]} rotation={[0,0,-.7]}><coneGeometry args={[.1,.28,10]} /><Metal color="#fff7ed" glow="#ffffff" intensity={.3} /></mesh>
    </group>
  );
}

export function PrometheusModel() {
  const ref=useRef<THREE.Group>(null);
  useFrame((s)=>{if(ref.current)ref.current.scale.setScalar(1+Math.sin(s.clock.elapsedTime*2)*.035)});
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.05,.12,18,72]} /><Metal color="#e6522c" glow="#ff5a2f" intensity={.7} /></mesh>
      {[0,1,2].map(i=><mesh key={i} position={[0,.15+i*.12,0]} scale={[1-i*.18,1,1]}><coneGeometry args={[.62,.95,5]} /><Metal color={i===1?"#ff7a45":"#e6522c"} glow="#ff4d1f" intensity={.62} /></mesh>)}
      <mesh position={[0,-.62,.1]}><cylinderGeometry args={[.62,.82,.2,32]} /><Metal color="#f8fafc" glow="#fff" intensity={.16} /></mesh>
    </group>
  );
}

export function AzureModel() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * .7) * .3; });
  return (
    <group ref={ref} rotation={[0, 0, -.08]}>
      <mesh position={[-.36, 0, 0]} rotation={[0, 0, -.22]} scale={[.34, 1.45, .28]}><boxGeometry args={[1,1,1]} /><Metal color="#0089d6" glow="#38bdf8" intensity={.65} /></mesh>
      <mesh position={[.4, .08, 0]} rotation={[0, 0, .38]} scale={[.34, 1.2, .28]}><boxGeometry args={[1,1,1]} /><Metal color="#00a4ef" glow="#38bdf8" intensity={.72} /></mesh>
      <mesh position={[.08, -.55, .05]} rotation={[0, 0, -.08]} scale={[.78, .19, .32]}><boxGeometry args={[1,1,1]} /><Metal color="#0078d4" glow="#0ea5e9" intensity={.6} /></mesh>
    </group>
  );
}

export function GrafanaModel() {
  const ref = useRef<THREE.Group>(null);
  const satellites = useMemo(() => Array.from({length:8},(_,i)=>i*Math.PI*2/8),[]);
  useFrame((_,d) => { if (ref.current) ref.current.rotation.z += d * .34; });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.72,.2,18,64,Math.PI*1.65]} /><Metal color="#f46800" glow="#ff7a00" intensity={.78} /></mesh>
      <mesh position={[.05,0,.05]}><sphereGeometry args={[.3,24,20]} /><Metal color="#ff8f00" glow="#f97316" intensity={.8} /></mesh>
      {satellites.map((a,i)=><mesh key={i} position={[Math.cos(a)*1.02,Math.sin(a)*1.02,0]}><sphereGeometry args={[i%2?.08:.12,14,14]} /><Metal color="#f46800" glow="#ff7a00" intensity={.72} /></mesh>)}
    </group>
  );
}

export function AnsibleModel() {
  return (
    <group>
      <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[1,.13,18,72]} /><Metal color="#ef4444" glow="#ff2d2d" intensity={.65} /></mesh>
      <mesh position={[0,.05,.04]} rotation={[0,0,0]}><coneGeometry args={[.58,1.35,3]} /><Metal color="#f8fafc" glow="#fff" intensity={.16} /></mesh>
      <mesh position={[.15,-.12,.2]} rotation={[0,0,-.38]} scale={[.12,.72,.12]}><boxGeometry args={[1,1,1]} /><Metal color="#ef4444" glow="#ff2d2d" intensity={.5} /></mesh>
    </group>
  );
}

export type DevOpsModelId = "linux"|"code"|"git"|"jenkins"|"docker"|"kubernetes"|"terraform"|"aws"|"prometheus"|"azure"|"grafana"|"ansible";
export function DevOpsModel({ id }: { id: DevOpsModelId }) {
  if (id==="code"||id==="linux") return <LinuxModel />;
  if (id==="git") return <GitModel />;
  if (id==="jenkins") return <JenkinsModel />;
  if (id==="docker") return <DockerModel />;
  if (id==="kubernetes") return <KubernetesModel />;
  if (id==="terraform") return <TerraformModel />;
  if (id==="aws") return <AwsModel />;
  if (id==="azure") return <AzureModel />;
  if (id==="grafana") return <GrafanaModel />;
  if (id==="ansible") return <AnsibleModel />;
  return <PrometheusModel />;
}
