"use client";

import { useMemo, useSyncExternalStore, type CSSProperties, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";
import { DevOpsModel, type DevOpsModelId } from "./devops-models";
import { workflowStages } from "@/lib/workflow-stages";

export { workflowStages } from "@/lib/workflow-stages";

function StageObject({stage,index}:{stage:(typeof workflowStages)[number];index:number}){
 const x=index*4.25;
 return <group position={[x,0,0]}>
   <Float speed={1.15+index*.04} rotationIntensity={.12} floatIntensity={.3}>
     <group scale={stage.id==="jenkins"?.98:stage.id==="terraform"?1.35:1.15}><DevOpsModel id={stage.id as DevOpsModelId}/></group>
     <Html transform sprite center distanceFactor={7.5} position={[0,-1.72,.2]}><div className="model-label workflow-model-label" style={{"--model-color":stage.color} as CSSProperties}><span/>{stage.label}</div></Html>
   </Float>
   <mesh position={[0,-1.62,-.3]} rotation={[Math.PI/2,0,0]}><ringGeometry args={[.85,1.55,64]}/><meshBasicMaterial color={stage.color} transparent opacity={.12} side={THREE.DoubleSide}/></mesh>
   <pointLight color={stage.color} intensity={7} distance={5} position={[0,0,2]}/>
 </group>
}
function CameraRig({progress}:{progress:MutableRefObject<number>}){
 useFrame((s,d)=>{const a=s.size.width/Math.max(s.size.height,1);const x=THREE.MathUtils.clamp(progress.current,0,1)*(workflowStages.length-1)*4.25;s.camera.position.x=THREE.MathUtils.damp(s.camera.position.x,x,3.2,d);s.camera.position.y=THREE.MathUtils.damp(s.camera.position.y,Math.sin(progress.current*Math.PI*2)*.18,3,d);s.camera.position.z=THREE.MathUtils.damp(s.camera.position.z,a<.9?9.8:7.3,3,d);s.camera.lookAt(s.camera.position.x,0,0)});
 return null;
}
function Scene({progress}:{progress:MutableRefObject<number>}){
 return <><color attach="background" args={["#07070a"]}/><fog attach="fog" args={["#07070a",8,17]}/><ambientLight intensity={.42}/><directionalLight position={[2,4,5]} intensity={2.1} color="#c4b5fd"/><directionalLight position={[-3,-1,4]} intensity={1.1} color="#22d3ee"/><Stars radius={70} depth={38} count={760} factor={2.1} saturation={.3} fade speed={.18}/><Sparkles count={48} scale={[34,7,7]} size={1.3} speed={.16} opacity={.25} color="#9c8cff"/>{workflowStages.map((s,i)=><StageObject key={s.id} stage={s} index={i}/>)}<gridHelper args={[42,42,"#17172c","#0f0f19"]} position={[14.8,-1.78,0]}/><CameraRig progress={progress}/></>
}
export function WorkflowScene({progress,className=""}:{progress:MutableRefObject<number>;className?:string}){
 const mounted=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
 const supported=useMemo(()=>{if(!mounted)return false;try{const c=document.createElement("canvas");const x=c.getContext("webgl2")||c.getContext("webgl");x?.getExtension("WEBGL_lose_context")?.loseContext();return Boolean(x)}catch{return false}},[mounted]);
 if(!mounted||!supported)return <div className={`workflow-fallback ${className}`} aria-label="DevOps delivery workflow"><div className="fallback-orbit"><span/><span/><span/></div></div>;
 return <div className={className} aria-label="Scroll-driven 3D DevOps workflow"><Canvas dpr={[1,1.4]} camera={{position:[0,0,7.3],fov:42}} gl={{antialias:true,alpha:false,powerPreference:"high-performance"}}><Scene progress={progress}/></Canvas></div>
}
