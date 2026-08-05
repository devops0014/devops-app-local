-- 15 realistic DevOps interview questions for the first demo dataset
insert into public.categories (name, icon, slug, color, sort_order) values
  ('Linux', 'Terminal', 'linux', '#a78bfa', 1),
  ('Git', 'GitBranch', 'git', '#fb7185', 2),
  ('Docker', 'Container', 'docker', '#38bdf8', 3),
  ('Kubernetes', 'Boxes', 'kubernetes', '#818cf8', 4),
  ('Jenkins', 'Workflow', 'jenkins', '#f59e0b', 5),
  ('Terraform', 'Blocks', 'terraform', '#8b5cf6', 6),
  ('AWS', 'Cloud', 'aws', '#fb923c', 7),
  ('Monitoring', 'Activity', 'monitoring', '#2dd4bf', 8),
  ('Networking', 'Network', 'networking', '#22d3ee', 9),
  ('Scripting', 'Code2', 'scripting', '#4ade80', 10)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, color = excluded.color;

insert into public.questions
  (category_id, question_text, answer_text, difficulty, tags, company_asked, is_bookmarked_count)
values
  ((select id from public.categories where slug='kubernetes'),
   'A Deployment has healthy pods, but the Service returns intermittent 503 errors. How would you troubleshoot it?',
   'Trace the request path: verify Service selectors and EndpointSlices, compare targetPort with the listening port, inspect readiness failures, call the Service and individual pod IPs from a debug pod, and check load-balancer health. A Running pod may still be excluded from endpoints.',
   'Hard', array['services','endpoints','troubleshooting'], array['Amazon','TCS'], 892),
  ((select id from public.categories where slug='docker'),
   'Why is a multi-stage Docker build important in production?',
   'It separates compilation from runtime. Build tools stay in the builder stage while the final image contains only the artifact and runtime libraries, reducing size, pull time, patching surface, and attack surface.',
   'Easy', array['dockerfile','security','optimization'], array['Infosys','Accenture'], 614),
  ((select id from public.categories where slug='terraform'),
   'How do you safely handle Terraform state in a team?',
   'Use an encrypted, versioned remote backend with locking and least-privilege access. Run reviewed plans and controlled applies from CI, separate environment state, and audit state access because state can contain sensitive values.',
   'Medium', array['state','backend','collaboration'], array['Deloitte','Wipro'], 755),
  ((select id from public.categories where slug='linux'),
   'A server has high load average but CPU usage is low. What could be happening?',
   'Load includes runnable tasks and tasks in uninterruptible I/O sleep. Inspect vmstat, iostat, pidstat, blocked processes, filesystem capacity, storage latency, NFS health, and kernel logs.',
   'Hard', array['performance','load-average','io'], array['Google','Amazon'], 982),
  ((select id from public.categories where slug='git'),
   'When would you use git revert instead of git reset?',
   'Use git revert for shared history because it creates a new commit that safely undoes a change. Use reset mainly for unpublished local history when intentionally moving the branch pointer.',
   'Easy', array['revert','reset','production'], array['TCS','Capgemini'], 430),
  ((select id from public.categories where slug='jenkins'),
   'A Jenkins pipeline became 40% slower after no code change. How do you investigate?',
   'Compare stage timings, agent queue time, executor saturation, cache hit rate, workspace size, registry and scanner latency, test parallelism, and agent CPU, memory, disk, and network. Fix the measured bottleneck and keep per-stage performance baselines.',
   'Hard', array['pipeline','performance','troubleshooting'], array['Microsoft','Cognizant'], 721),
  ((select id from public.categories where slug='aws'),
   'How do an Application Load Balancer and Network Load Balancer differ?',
   'ALB operates at Layer 7 for HTTP features such as host and path routing. NLB operates mainly at Layer 4 for TCP, UDP, and TLS with very high throughput and static IP options.',
   'Medium', array['alb','nlb','networking'], array['Amazon','HCL'], 688),
  ((select id from public.categories where slug='monitoring'),
   'What makes an alert actionable instead of noisy?',
   'An actionable alert represents service impact, has an owner and severity, contains useful context, and points to a runbook. Prefer SLO symptoms and sustained impact over every low-level metric.',
   'Medium', array['alertmanager','slo','observability'], array['Netflix','Google'], 804),
  ((select id from public.categories where slug='networking'),
   'Explain what happens after a user enters a domain name for an application running on EKS.',
   'DNS resolves to the load balancer. The load balancer routes to the ingress controller or Service target, rules choose the Service, the Service selects ready pod endpoints, and the cluster networking path delivers the request to a pod IP.',
   'Hard', array['dns','eks','traffic-flow'], array['Paytm','Amazon'], 1102),
  ((select id from public.categories where slug='scripting'),
   'How would you write a safe Bash script for production automation?',
   'Use strict mode, validate inputs, quote expansions, create explicit temporary directories, add cleanup traps, protect secrets, make operations idempotent, return meaningful exit codes, run ShellCheck, and provide dry-run behavior for destructive work.',
   'Medium', array['bash','automation','safety'], array['TCS','IBM'], 477),
  ((select id from public.categories where slug='kubernetes'),
   'What is the difference between readiness, liveness, and startup probes?',
   'Readiness controls whether a pod receives Service traffic. Liveness restarts a stuck container. Startup protects a slow-starting application by delaying the other probes until initialization succeeds.',
   'Easy', array['probes','health-checks'], array['Red Hat','Infosys'], 936),
  ((select id from public.categories where slug='docker'),
   'A container works locally but exits immediately in Kubernetes. What do you check?',
   'Compare entrypoint, command, environment, mounts, permissions, working directory, and architecture. Inspect events and current and previous logs. The container remains alive only while its main PID is running.',
   'Medium', array['entrypoint','crashloopbackoff','debugging'], array['Wipro','Accenture'], 644),
  ((select id from public.categories where slug='terraform'),
   'Why can using count make resource changes risky compared with for_each?',
   'Count uses numeric indexes, so removing a middle item can shift later addresses and cause unexpected changes. For_each uses stable keys, so only the removed key is affected.',
   'Medium', array['count','for-each','state'], array['Deloitte','TCS'], 590),
  ((select id from public.categories where slug='aws'),
   'How would you design secure cross-account deployment from CI/CD?',
   'Use OIDC and short-lived role assumption into the target account. Restrict trust by issuer, audience, repository, branch, and environment; grant least privilege; protect production with approvals and audit through CloudTrail.',
   'Hard', array['iam','oidc','ci-cd'], array['Amazon','Microsoft'], 850),
  ((select id from public.categories where slug='monitoring'),
   'What are the four golden signals, and how do you use them?',
   'Latency, traffic, errors, and saturation describe user experience and capacity. Build service dashboards around them and alert on SLO burn rate or sustained impact instead of isolated spikes.',
   'Easy', array['prometheus','grafana','sre'], array['Google','Netflix'], 712);

-- Stable application keys keep local mock data and cloud progress compatible.
update public.questions set source_key = 'q-001' where question_text like 'A Deployment has healthy pods%';
update public.questions set source_key = 'q-002' where question_text = 'Why is a multi-stage Docker build important in production?';
update public.questions set source_key = 'q-003' where question_text = 'How do you safely handle Terraform state in a team?';
update public.questions set source_key = 'q-004' where question_text like 'A server has high load average%';
update public.questions set source_key = 'q-005' where question_text = 'When would you use git revert instead of git reset?';
update public.questions set source_key = 'q-006' where question_text like 'A Jenkins pipeline became 40% slower%';
update public.questions set source_key = 'q-007' where question_text = 'How do an Application Load Balancer and Network Load Balancer differ?';
update public.questions set source_key = 'q-008' where question_text = 'What makes an alert actionable instead of noisy?';
update public.questions set source_key = 'q-009' where question_text like 'Explain what happens after a user enters a domain name%';
update public.questions set source_key = 'q-010' where question_text = 'How would you write a safe Bash script for production automation?';
update public.questions set source_key = 'q-011' where question_text = 'What is the difference between readiness, liveness, and startup probes?';
update public.questions set source_key = 'q-012' where question_text like 'A container works locally but exits immediately%';
update public.questions set source_key = 'q-013' where question_text like 'Why can using count make resource changes risky%';
update public.questions set source_key = 'q-014' where question_text = 'How would you design secure cross-account deployment from CI/CD?';
update public.questions set source_key = 'q-015' where question_text = 'What are the four golden signals, and how do you use them?';
