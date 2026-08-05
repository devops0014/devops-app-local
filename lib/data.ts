import type { Question } from "./types";

export const categories = [
  { name: "Linux", slug: "linux", icon: "Terminal", color: "#a78bfa", mastery: 82, total: 184 },
  { name: "Git", slug: "git", icon: "GitBranch", color: "#fb7185", mastery: 76, total: 142 },
  { name: "Docker", slug: "docker", icon: "Container", color: "#38bdf8", mastery: 68, total: 218 },
  { name: "Kubernetes", slug: "kubernetes", icon: "Boxes", color: "#818cf8", mastery: 54, total: 326 },
  { name: "Jenkins", slug: "jenkins", icon: "Workflow", color: "#f59e0b", mastery: 71, total: 156 },
  { name: "Terraform", slug: "terraform", icon: "Blocks", color: "#8b5cf6", mastery: 64, total: 204 },
  { name: "AWS", slug: "aws", icon: "Cloud", color: "#fb923c", mastery: 59, total: 248 },
  { name: "Monitoring", slug: "monitoring", icon: "Activity", color: "#2dd4bf", mastery: 73, total: 119 },
  { name: "Networking", slug: "networking", icon: "Network", color: "#22d3ee", mastery: 48, total: 136 },
  { name: "Scripting", slug: "scripting", icon: "Code2", color: "#4ade80", mastery: 66, total: 124 },
];

export const questions: Question[] = [
  {
    id: "q-001",
    category: "Kubernetes",
    categorySlug: "kubernetes",
    question: "A Deployment has healthy pods, but the Service returns intermittent 503 errors. How would you troubleshoot it?",
    answer: `I would trace the request path instead of restarting pods blindly:

1. Check the Service selector and EndpointSlices to confirm every endpoint is a ready pod: \`kubectl get svc,endpointslice -n <ns>\`.
2. Compare \`targetPort\` with the container's actual listening port.
3. Inspect readiness probe failures and pod events. A pod can be Running but excluded from endpoints.
4. Test the service from an ephemeral debug pod and call individual pod IPs.
5. Check ingress or load-balancer health checks, connection draining, and application latency.

In one production case, the readiness path depended on a slow downstream API. Pods repeatedly moved in and out of the EndpointSlice, producing intermittent 503s. We changed readiness to validate only local serving capability, added a startup probe, and monitored endpoint churn.`,
    difficulty: "Hard",
    tags: ["services", "endpoints", "troubleshooting"],
    companies: ["Amazon", "TCS"],
    bookmarks: 892,
    options: [
      "Restart all pods immediately",
      "Trace Service selectors, EndpointSlices, ports, and readiness",
      "Increase Deployment replicas only",
      "Delete the Service",
    ],
    correctOption: 1,
  },
  {
    id: "q-002",
    category: "Docker",
    categorySlug: "docker",
    question: "Why is a multi-stage Docker build important in production?",
    answer: `A multi-stage build separates compilation from the runtime image. The builder stage can contain compilers, package managers, and test tools, while the final stage copies only the application artifact and required runtime libraries.

This reduces image size, patching surface, pull time, and the number of packages an attacker can use. For example, a Java service can build with Maven in one stage and run the JAR from a slim JRE image in the final stage.`,
    difficulty: "Easy",
    tags: ["dockerfile", "security", "optimization"],
    companies: ["Infosys", "Accenture"],
    bookmarks: 614,
    options: [
      "It creates multiple running containers",
      "It separates build tools from the minimal runtime image",
      "It automatically scales containers",
      "It replaces a registry",
    ],
    correctOption: 1,
  },
  {
    id: "q-003",
    category: "Terraform",
    categorySlug: "terraform",
    question: "How do you safely handle Terraform state in a team?",
    answer: `I keep state in a remote backend with encryption, versioning, least-privilege access, and locking. For AWS, that typically means an encrypted, versioned S3 bucket and S3 native lockfiles or the backend's supported locking mechanism.

CI runs \`terraform plan\` and publishes the plan for review. Apply runs from a controlled pipeline, not from individual laptops. Environments have separate state keys or accounts. State access is audited because state may contain sensitive values even when outputs are marked sensitive.`,
    difficulty: "Medium",
    tags: ["state", "backend", "collaboration"],
    companies: ["Deloitte", "Wipro"],
    bookmarks: 755,
    options: [
      "Commit terraform.tfstate to Git",
      "Share one local state file",
      "Use an encrypted remote backend with locking and controlled applies",
      "Disable state refresh",
    ],
    correctOption: 2,
  },
  {
    id: "q-004",
    category: "Linux",
    categorySlug: "linux",
    question: "A server has high load average but CPU usage is low. What could be happening?",
    answer: `Linux load average includes runnable tasks and tasks in uninterruptible sleep, commonly waiting on I/O. Low CPU with high load often points to disk, NFS, or blocked kernel I/O.

I would inspect \`vmstat 1\`, \`iostat -xz 1\`, \`pidstat -d 1\`, blocked processes in \`ps\`, and kernel logs. I would also check filesystem capacity, inode usage, storage latency, and network storage health before changing CPU capacity.`,
    difficulty: "Hard",
    tags: ["performance", "load-average", "i/o"],
    companies: ["Google", "Amazon"],
    bookmarks: 982,
  },
  {
    id: "q-005",
    category: "Git",
    categorySlug: "git",
    question: "When would you use git revert instead of git reset?",
    answer: `Use \`git revert\` for a commit that has already been shared because it creates a new commit that safely undoes the change without rewriting public history. Use \`git reset\` mainly for local, unpublished history when you intentionally want to move the branch pointer.

In a production branch, I would normally revert the faulty merge or commit, validate the fix, and keep the audit trail intact.`,
    difficulty: "Easy",
    tags: ["revert", "reset", "production"],
    companies: ["TCS", "Capgemini"],
    bookmarks: 430,
  },
  {
    id: "q-006",
    category: "Jenkins",
    categorySlug: "jenkins",
    question: "A Jenkins pipeline became 40% slower after no code change. How do you investigate?",
    answer: `I first compare stage timing against a known-good build to locate the regression. Then I check agent queue time, executor saturation, workspace and artifact size, dependency cache hit rate, registry latency, test parallelism, and external scanner response time.

I also inspect agent CPU, memory, disk I/O, and network. In production, a common cause is a cold or invalidated dependency cache—not Jenkins itself. I fix the bottleneck, add per-stage timing, and set a performance baseline so future regressions are visible.`,
    difficulty: "Hard",
    tags: ["pipeline", "performance", "troubleshooting"],
    companies: ["Microsoft", "Cognizant"],
    bookmarks: 721,
  },
  {
    id: "q-007",
    category: "AWS",
    categorySlug: "aws",
    question: "How do an Application Load Balancer and Network Load Balancer differ?",
    answer: `ALB operates at Layer 7 and understands HTTP/HTTPS, so it supports host/path routing, redirects, headers, WebSockets, and WAF integration. NLB operates mainly at Layer 4, handles TCP/UDP/TLS, preserves very high throughput, and provides static IP options.

I choose based on protocol and routing needs—not simply performance. A web microservices platform usually benefits from ALB; a latency-sensitive TCP service or fixed-IP requirement may fit NLB.`,
    difficulty: "Medium",
    tags: ["alb", "nlb", "networking"],
    companies: ["Amazon", "HCL"],
    bookmarks: 688,
    options: [
      "ALB is Layer 7 for HTTP routing; NLB is Layer 4 for TCP/UDP and high throughput",
      "ALB is only for private subnets; NLB is only public",
      "NLB supports path routing; ALB does not",
      "There is no functional difference",
    ],
    correctOption: 0,
  },
  {
    id: "q-008",
    category: "Monitoring",
    categorySlug: "monitoring",
    question: "What makes an alert actionable instead of noisy?",
    answer: `An actionable alert represents user or service impact, has a clear owner, includes useful context, and points to a runbook. I prefer alerts based on SLO symptoms—latency, errors, traffic, saturation—over every low-level metric.

I tune duration and severity, group related alerts, inhibit dependent alerts, and review false positives. Every page should answer: what is broken, who owns it, how urgent is it, and what should the responder check first?`,
    difficulty: "Medium",
    tags: ["alertmanager", "slo", "observability"],
    companies: ["Netflix", "Google"],
    bookmarks: 804,
  },
  {
    id: "q-009",
    category: "Networking",
    categorySlug: "networking",
    question: "Explain what happens after a user enters a domain name for an application running on EKS.",
    answer: `The client resolves the domain through DNS to the load balancer. The load balancer forwards the request according to its listener and target-group health. With an ingress setup, the ingress controller receives the request, matches host/path rules, and forwards it to the Kubernetes Service.

The Service selects ready pod endpoints, while kube-proxy or the cluster networking implementation programs the forwarding path. The packet reaches a pod IP, and the response returns through the established connection. Exact hops vary by load-balancer target mode and CNI.`,
    difficulty: "Hard",
    tags: ["dns", "eks", "traffic-flow"],
    companies: ["Paytm", "Amazon"],
    bookmarks: 1_102,
  },
  {
    id: "q-010",
    category: "Scripting",
    categorySlug: "scripting",
    question: "How would you write a safe Bash script for production automation?",
    answer: `I use \`set -euo pipefail\`, validate inputs, quote variable expansions, avoid parsing human-formatted output, use explicit temporary directories, and add cleanup traps. I keep secrets out of arguments and logs, make operations idempotent where possible, and return meaningful exit codes.

Before production use, I run ShellCheck, test failure paths, add structured logging, and document required permissions. Destructive actions need explicit target validation and usually a dry-run mode.`,
    difficulty: "Medium",
    tags: ["bash", "automation", "safety"],
    companies: ["TCS", "IBM"],
    bookmarks: 477,
  },
  {
    id: "q-011",
    category: "Kubernetes",
    categorySlug: "kubernetes",
    question: "What is the difference between readiness, liveness, and startup probes?",
    answer: `Readiness decides whether a pod should receive Service traffic. Liveness decides whether kubelet should restart a stuck container. Startup protects slow-starting applications by delaying liveness and readiness evaluation until startup succeeds.

I keep readiness focused on the ability to serve traffic, avoid fragile downstream dependencies in liveness, and size startup thresholds from measured cold-start behavior.`,
    difficulty: "Easy",
    tags: ["probes", "health-checks"],
    companies: ["Red Hat", "Infosys"],
    bookmarks: 936,
    options: [
      "All three probes restart the pod",
      "Readiness controls traffic, liveness restarts stuck containers, startup protects slow starts",
      "Startup probes are only for Jobs",
      "Readiness is checked only once",
    ],
    correctOption: 1,
  },
  {
    id: "q-012",
    category: "Docker",
    categorySlug: "docker",
    question: "A container works locally but exits immediately in Kubernetes. What do you check?",
    answer: `I compare the image command, entrypoint, environment, mounted files, user permissions, working directory, and architecture. Then I inspect pod events, current logs, and \`kubectl logs --previous\`.

Containers stay alive only while their main PID is running. A local interactive shell can hide a process that exits instantly in Kubernetes. I reproduce using the same command, environment, and security context as the pod.`,
    difficulty: "Medium",
    tags: ["entrypoint", "crashloopbackoff", "debugging"],
    companies: ["Wipro", "Accenture"],
    bookmarks: 644,
  },
  {
    id: "q-013",
    category: "Terraform",
    categorySlug: "terraform",
    question: "Why can using count make resource changes risky compared with for_each?",
    answer: `\`count\` addresses instances by numeric index. Removing an item from the middle of a list can shift later indexes, making Terraform propose unexpected replacements. \`for_each\` uses stable keys, so removing one key affects only that resource.

I use \`count\` for truly identical indexed resources and \`for_each\` for named resources with independent identity.`,
    difficulty: "Medium",
    tags: ["count", "for-each", "state"],
    companies: ["Deloitte", "TCS"],
    bookmarks: 590,
  },
  {
    id: "q-014",
    category: "AWS",
    categorySlug: "aws",
    question: "How would you design secure cross-account deployment from CI/CD?",
    answer: `The CI system authenticates with short-lived identity—preferably OIDC—and assumes a narrowly scoped role in the target account. The trust policy restricts the issuer, audience, repository, branch, or environment. The permission policy grants only deployment actions.

Production roles require protected environment approval, CloudTrail auditing, and separate accounts from development. I avoid long-lived access keys and do not share one broad role across all pipelines.`,
    difficulty: "Hard",
    tags: ["iam", "oidc", "ci-cd"],
    companies: ["Amazon", "Microsoft"],
    bookmarks: 850,
  },
  {
    id: "q-015",
    category: "Monitoring",
    categorySlug: "monitoring",
    question: "What are the four golden signals, and how do you use them?",
    answer: `The four golden signals are latency, traffic, errors, and saturation. Together they describe how users experience a service and whether it is approaching capacity.

I build service dashboards around them, segment latency into successful and failed requests, define error ratios, and track saturation for the constrained resource. Alerts then use SLO burn rate or sustained impact instead of isolated spikes.`,
    difficulty: "Easy",
    tags: ["prometheus", "grafana", "sre"],
    companies: ["Google", "Netflix"],
    bookmarks: 712,
  },
];

export const performanceData = [
  { day: "Mon", accuracy: 61, questions: 18 },
  { day: "Tue", accuracy: 66, questions: 24 },
  { day: "Wed", accuracy: 64, questions: 16 },
  { day: "Thu", accuracy: 72, questions: 31 },
  { day: "Fri", accuracy: 75, questions: 27 },
  { day: "Sat", accuracy: 81, questions: 42 },
  { day: "Sun", accuracy: 86, questions: 36 },
];

export const radarData = [
  { category: "Linux", score: 82 },
  { category: "Docker", score: 68 },
  { category: "K8s", score: 54 },
  { category: "Terraform", score: 64 },
  { category: "AWS", score: 59 },
  { category: "Monitoring", score: 73 },
];

export const attempts = [
  { id: "QA-2048", mode: "Mixed Quiz", date: "Today, 10:24 AM", score: 86, total: 20, time: "18m 42s" },
  { id: "QA-2031", mode: "Kubernetes Drill", date: "Yesterday", score: 72, total: 15, time: "14m 08s" },
  { id: "QA-1994", mode: "Mock Interview", date: "24 Jul 2026", score: 78, total: 10, time: "31m 12s" },
  { id: "QA-1932", mode: "AWS Flashcards", date: "22 Jul 2026", score: 91, total: 25, time: "12m 51s" },
];
