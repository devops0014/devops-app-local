import type { ElementType } from "react";
import {
  Activity,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  BriefcaseBusiness,
  Container,
  FileCheck2,
  Gauge,
  GitPullRequest,
  Network,
  ServerCog,
  TerminalSquare,
  Wrench,
} from "lucide-react";

export type PipelineStage = {
  name: string;
  phase: string;
  idleStatus: string;
  activeStatus: string;
  questions: string;
  labs: string;
  color: string;
  icon: ElementType;
  command: string;
  output: string;
};

export const PIPELINE_STEP_MS = 2400;
export const WORKFLOW_STEP_MS = 2600;

export const pipelineStages: PipelineStage[] = [
  { name: "GitHub", phase: "COMMIT", idleStatus: "Repository ready", activeStatus: "Commit pushed", questions: "180+", labs: "18", color: "#a78bfa", icon: GitPullRequest, command: "git push origin main", output: "✓ Commit 82f4c1 pushed" },
  { name: "Jenkins", phase: "BUILD", idleStatus: "Agent available", activeStatus: "Running build", questions: "240+", labs: "32", color: "#f97316", icon: Wrench, command: "jenkins build devopscrack", output: "✓ Build #284 succeeded" },
  { name: "Docker", phase: "IMAGE", idleStatus: "Registry connected", activeStatus: "Image built", questions: "350+", labs: "45", color: "#38bdf8", icon: Container, command: "docker build -t app:v284 .", output: "✓ Image signed · 118 MB" },
  { name: "Kubernetes", phase: "DEPLOY", idleStatus: "Cluster healthy", activeStatus: "Scaling replicas", questions: "420+", labs: "58", color: "#60a5fa", icon: Network, command: "kubectl apply -f deployment.yaml", output: "✓ 3 / 3 pods ready" },
  { name: "Terraform", phase: "PROVISION", idleStatus: "State locked", activeStatus: "Applying plan", questions: "280+", labs: "34", color: "#8b5cf6", icon: Boxes, command: "terraform apply -auto-approve", output: "✓ Infrastructure ready" },
  { name: "Prometheus", phase: "METRICS", idleStatus: "Targets healthy", activeStatus: "Metrics streaming", questions: "160+", labs: "16", color: "#fb7185", icon: Activity, command: "curl -s prometheus:9090/-/ready", output: "✓ SLO protected · 0.08% errors" },
  { name: "Grafana", phase: "HEALTH", idleStatus: "Dashboard online", activeStatus: "Systems healthy", questions: "140+", labs: "14", color: "#fb923c", icon: Gauge, command: "kubectl get pods -A", output: "✓ Production is healthy" },
];

export const workflowStages = [
  { step: "01", title: "Learn", copy: "Build the production foundations.", tags: ["Linux", "Git", "Docker"], icon: BookOpenCheck, color: "#8b5cf6" },
  { step: "02", title: "Practice", copy: "Turn knowledge into fast recall.", tags: ["Questions", "MCQs", "Labs"], icon: TerminalSquare, color: "#22d3ee" },
  { step: "03", title: "AI Mock", copy: "Think aloud under real pressure.", tags: ["Technical", "Scenario", "Feedback"], icon: BrainCircuit, color: "#60a5fa" },
  { step: "04", title: "Resume Review", copy: "Make your experience credible.", tags: ["Impact", "Keywords", "Clarity"], icon: FileCheck2, color: "#34d399" },
  { step: "05", title: "Get Hired", copy: "Walk in with systems confidence.", tags: ["Interview", "Offer", "Growth"], icon: BriefcaseBusiness, color: "#f59e0b" },
] as const;

export const motionTokens = {
  spring: { type: "spring", stiffness: 150, damping: 20, mass: .8 } as const,
  gentleSpring: { type: "spring", stiffness: 85, damping: 18, mass: 1 } as const,
  reveal: { duration: .62, ease: [0.22, 1, 0.36, 1] as const },
  hoverScale: 1.02,
  hoverLift: -6,
};
