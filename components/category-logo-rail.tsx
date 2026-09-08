"use client";

import type { CSSProperties, ComponentType } from "react";
import { Activity, Boxes, Cloud, CloudCog, Database, Gauge, Globe2, Network, ShieldCheck, UsersRound, Workflow } from "lucide-react";
import type { ContentCategory } from "@/lib/hooks/use-content-catalog";

const brandAssets: Record<string, string> = {
  ansible: "/category-icons/ansible.svg", argocd: "/category-icons/argo.svg", argo: "/category-icons/argo.svg",
  docker: "/category-icons/docker.svg", git: "/category-icons/git.svg", github: "/category-icons/githubactions.svg",
  "github-actions": "/category-icons/githubactions.svg", grafana: "/category-icons/grafana.svg",
  "hashicorp-vault": "/category-icons/vault.svg", vault: "/category-icons/vault.svg", helm: "/category-icons/helm.svg",
  istio: "/category-icons/istio.svg", jenkins: "/category-icons/jenkins.svg", kafka: "/category-icons/apachekafka.svg",
  kubernetes: "/category-icons/kubernetes.svg", k8s: "/category-icons/kubernetes.svg", linux: "/category-icons/linux.svg",
  maven: "/category-icons/apachemaven.svg", nginx: "/category-icons/nginx.svg", prometheus: "/category-icons/prometheus.svg",
  "python-bash": "/category-icons/python.svg", python: "/category-icons/python.svg",
  sonarqube: "/category-icons/sonarqubeserver.svg", terraform: "/category-icons/terraform.svg",
};

const conceptIcons: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  aws: Cloud, azure: CloudCog, "azure-devops": Workflow, behavioral: UsersRound,
  "behavioral-questions": UsersRound, databases: Database, database: Database,
  devsecops: ShieldCheck, eks: Network, "ecs-fargate": Boxes, monitoring: Activity,
  networking: Network, security: ShieldCheck, sre: Gauge, "dns-cdn": Globe2,
};

const brandColors: Record<string, string> = {
  ansible: "#ef4444", argocd: "#ef7b4d", aws: "#f59e0b", azure: "#38bdf8", "azure-devops": "#38bdf8",
  behavioral: "#c084fc", "behavioral-questions": "#c084fc", databases: "#22d3ee", database: "#22d3ee",
  devsecops: "#34d399", docker: "#2496ed", eks: "#60a5fa", "ecs-fargate": "#f59e0b", git: "#f05032",
  "github-actions": "#2088ff", grafana: "#f46800", helm: "#38bdf8", istio: "#466bb0", jenkins: "#d33833",
  kafka: "#94a3b8", kubernetes: "#326ce5", k8s: "#326ce5", linux: "#e6b800", maven: "#c71a36",
  monitoring: "#f43f5e", networking: "#2dd4bf", nexus: "#f97316", nginx: "#009639", prometheus: "#e6522c",
  "python-bash": "#3776ab", security: "#34d399", sonarqube: "#4e9bcd", sre: "#a78bfa",
  terraform: "#844fba", vault: "#d9a900",
};

function CategoryMark({ category }: { category: ContentCategory }) {
  const asset = brandAssets[category.slug];
  if (asset) return <img src={asset} alt={`${category.name} logo`} width="48" height="48" loading="eager" />;
  const Icon = conceptIcons[category.slug] || Boxes;
  return <Icon className="category-logo-concept" aria-hidden />;
}

function CategoryButton({ category, active, spotlight = false, onSelect }: {
  category: ContentCategory; active: boolean; spotlight?: boolean; onSelect: (slug: string) => void;
}) {
  const color = brandColors[category.slug] || "#8b5cf6";
  return (
    <button type="button" onClick={() => onSelect(category.slug)}
      className={`category-logo-item ${active ? "is-active" : ""} ${spotlight ? "is-spotlight" : ""}`}
      style={{ "--category-color": color } as CSSProperties} aria-pressed={active}
      aria-label={`${active ? "Remove" : "Select"} ${category.name}`}>
      {spotlight ? <span className="category-logo-selected-label">Selected</span> : null}
      <span className="category-logo-visual"><CategoryMark category={category} /></span>
      <span className="category-logo-name">{category.name}</span>
      <span className="category-logo-count">{category.total} questions</span>
    </button>
  );
}

export function CategoryLogoRail({ categories, activeSlugs, onSelect }: {
  categories: ContentCategory[]; activeSlugs: string[]; onSelect: (slug: string) => void;
}) {
  if (!categories.length) return null;
  const repeated = [...categories, ...categories];
  const focusedCategory = categories.find((category) => category.slug === activeSlugs.at(-1));
  return (
    <section className="category-logo-experience" aria-label="Question categories">
      {focusedCategory ? (
        <div className="category-logo-spotlight" aria-live="polite">
          <span className="category-logo-spotlight-copy"><strong>{focusedCategory.name}</strong><span>Current question category</span></span>
          <CategoryButton category={focusedCategory} active spotlight onSelect={onSelect} />
        </div>
      ) : null}
      <div className="category-logo-rail">
        <div className="category-logo-track">
          {repeated.map((category, index) => <CategoryButton key={`${category.slug}-${index}`} category={category}
            active={activeSlugs.includes(category.slug)} onSelect={onSelect} />)}
        </div>
      </div>
    </section>
  );
}
