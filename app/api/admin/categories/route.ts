import { AdminApiError, apiError, audit, jsonBody, requireAdmin } from "@/lib/admin/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const DEFAULT_CATEGORIES = [
  { name: "Linux", icon: "Terminal", slug: "linux", color: "#facc15", sort_order: 1 },
  { name: "Git", icon: "GitBranch", slug: "git", color: "#f97316", sort_order: 2 },
  { name: "GitHub", icon: "Github", slug: "github", color: "#a1a1aa", sort_order: 3 },
  { name: "Docker", icon: "Container", slug: "docker", color: "#38bdf8", sort_order: 4 },
  { name: "Kubernetes", icon: "Boxes", slug: "kubernetes", color: "#60a5fa", sort_order: 5 },
  { name: "Jenkins", icon: "Workflow", slug: "jenkins", color: "#ef4444", sort_order: 6 },
  { name: "CI/CD", icon: "GitMerge", slug: "ci-cd", color: "#a78bfa", sort_order: 7 },
  { name: "Terraform", icon: "Blocks", slug: "terraform", color: "#8b5cf6", sort_order: 8 },
  { name: "Ansible", icon: "PlayCircle", slug: "ansible", color: "#ef4444", sort_order: 9 },
  { name: "AWS", icon: "Cloud", slug: "aws", color: "#fb923c", sort_order: 10 },
  { name: "Azure", icon: "CloudCog", slug: "azure", color: "#0ea5e9", sort_order: 11 },
  { name: "Monitoring", icon: "Activity", slug: "monitoring", color: "#2dd4bf", sort_order: 12 },
  { name: "Networking", icon: "Network", slug: "networking", color: "#22d3ee", sort_order: 13 },
  { name: "Scripting", icon: "Code2", slug: "scripting", color: "#4ade80", sort_order: 14 },
  { name: "DevSecOps", icon: "ShieldCheck", slug: "devsecops", color: "#f43f5e", sort_order: 15 },
];

async function categories() {
  const categoryResult = await supabaseAdmin!.from("categories").select("id,name,slug,color,icon,sort_order").order("sort_order");
  if (categoryResult.error) throw categoryResult.error;
  const fetchCountRows = async (table: "mcq_questions" | "general_questions") => {
    const rows: Array<{ category_id: string; is_published: boolean }> = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const page = await supabaseAdmin!.from(table).select("category_id,is_published").range(offset, offset + pageSize - 1);
      if (page.error) throw page.error;
      rows.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < pageSize) break;
    }
    return rows;
  };
  const [mcqRows, generalRows] = await Promise.all([fetchCountRows("mcq_questions"), fetchCountRows("general_questions")]);
  const counts = new Map<string, { total: number; published: number; draft: number }>();
  for (const row of [...mcqRows, ...generalRows]) {
    const current = counts.get(row.category_id) ?? { total: 0, published: 0, draft: 0 };
    current.total++;
    if (row.is_published) current.published++; else current.draft++;
    counts.set(row.category_id, current);
  }
  return (categoryResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    icon: row.icon,
    sort_order: row.sort_order,
    question_count: counts.get(row.id)?.total ?? 0,
    published_count: counts.get(row.id)?.published ?? 0,
    draft_count: counts.get(row.id)?.draft ?? 0,
  }));
}

type CategoryBody = {
  id?: string;
  name?: string;
  slug?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
};

function validateCategory(body: CategoryBody) {
  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const color = body.color?.trim() || "#8b5cf6";
  const icon = body.icon?.trim() || "Boxes";
  const sortOrder = Number(body.sort_order ?? 0);
  if (!name || name.length > 60) throw new AdminApiError("Category name is required and must be 60 characters or fewer.");
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AdminApiError("Slug may contain lowercase letters, numbers, and single hyphens only.");
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new AdminApiError("Choose a valid six-digit colour.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    throw new AdminApiError("Sort order must be a whole number between 0 and 9999.");
  }
  return { name, slug, color, icon, sort_order: sortOrder };
}

async function categoryById(id: string) {
  const rows = await categories();
  const category = rows.find((row) => row.id === id);
  if (!category) throw new AdminApiError("Category was not found.", 404);
  return category;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json({ categories: await categories() });
  } catch (cause) {
    return apiError(cause);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const raw = await request.text();
    if (!raw) {
      const { error } = await supabaseAdmin!
        .from("categories")
        .upsert(DEFAULT_CATEGORIES, { onConflict: "slug" });
      if (error) throw error;
      const rows = await categories();
      await audit(admin.id, "categories.defaults_created", "category", null, {
        category_count: rows.length,
      });
      return Response.json({ categories: rows }, { status: 201 });
    }
    const input = validateCategory(JSON.parse(raw) as CategoryBody);
    const { data, error } = await supabaseAdmin!.from("categories").insert(input).select("id").single();
    if (error?.code === "23505") throw new AdminApiError("A category with this name or slug already exists.", 409);
    if (error) throw error;
    const category = await categoryById(data.id);
    await audit(admin.id, "category.created", "category", data.id, { name: input.name, slug: input.slug });
    return Response.json({ category }, { status: 201 });
  } catch (cause) {
    if (cause instanceof SyntaxError) return apiError(new AdminApiError("The category request is not valid JSON."));
    return apiError(cause);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await jsonBody<CategoryBody>(request);
    if (!body.id) throw new AdminApiError("Category ID is required.");
    const input = validateCategory(body);
    const { error } = await supabaseAdmin!.from("categories").update(input).eq("id", body.id);
    if (error?.code === "23505") throw new AdminApiError("A category with this name or slug already exists.", 409);
    if (error) throw error;
    const category = await categoryById(body.id);
    await audit(admin.id, "category.updated", "category", body.id, { name: input.name, slug: input.slug });
    return Response.json({ category });
  } catch (cause) {
    return apiError(cause);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new AdminApiError("Category ID is required.");
    const category = await categoryById(id);
    if (category.question_count > 0) {
      throw new AdminApiError(
        `Move or delete the ${category.question_count} question${category.question_count === 1 ? "" : "s"} in this category first.`,
        409,
      );
    }
    const { error } = await supabaseAdmin!.from("categories").delete().eq("id", id);
    if (error) throw error;
    await audit(admin.id, "category.deleted", "category", id, { name: category.name, slug: category.slug });
    return Response.json({ deleted: true });
  } catch (cause) {
    return apiError(cause);
  }
}
