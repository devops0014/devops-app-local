export const workflowStages = [
  { id: "code", label: "Linux Workspace", short: "CODE", color: "#f5c84c" },
  { id: "git", label: "Git Repository", short: "GIT", color: "#f05032" },
  { id: "jenkins", label: "Jenkins Pipeline", short: "CI/CD", color: "#f59e0b" },
  { id: "docker", label: "Docker Container", short: "BUILD", color: "#2496ed" },
  { id: "kubernetes", label: "Kubernetes Cluster", short: "DEPLOY", color: "#326ce5" },
  { id: "terraform", label: "Terraform Infrastructure", short: "IaC", color: "#844fba" },
  { id: "aws", label: "AWS Cloud", short: "CLOUD", color: "#ff9900" },
  { id: "prometheus", label: "Prometheus Monitoring", short: "OBSERVE", color: "#e6522c" },
] as const;
