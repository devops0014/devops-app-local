"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FolderPlus, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
  type AdminCategory,
  type CategoryInput,
} from "@/lib/repositories/admin-repository";

const EMPTY_CATEGORY: CategoryInput = {
  name: "",
  slug: "",
  color: "#8b5cf6",
  icon: "Boxes",
  sort_order: 0,
};

export function CategoryManager({ query = "" }: { query?: string }) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<AdminCategory | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCategories(await listAdminCategories());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void listAdminCategories()
      .then(setCategories)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load categories."))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return categories.filter((category) => !term || `${category.name} ${category.slug}`.toLowerCase().includes(term));
  }, [categories, query]);

  async function remove(category: AdminCategory) {
    if (category.question_count > 0) {
      setError(`Move or delete the ${category.question_count} questions in ${category.name} before deleting this category.`);
      return;
    }
    if (!window.confirm(`Delete the empty category “${category.name}”?`)) return;
    setDeleting(category.id);
    setError("");
    try {
      await deleteAdminCategory(category.id);
      setMessage(`${category.name} was deleted.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete category.");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[98px] animate-pulse rounded-2xl border border-white/[.06] bg-white/[.025]" />)}</div>;
  }

  return (
    <div className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium">{categories.length} categories</p>
          <p className="mt-1 text-[10px] text-zinc-600">Question totals are calculated directly from Supabase.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refresh()}><RefreshCw size={13} /> Refresh</Button>
          <Button size="sm" onClick={() => setEditor("new")}><Plus size={13} /> New category</Button>
        </div>
      </div>

      {message && <p className="mb-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] p-3 text-xs text-emerald-300" role="status">{message}</p>}
      {error && <p className="mb-3 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-xs text-rose-300" role="alert">{error}</p>}

      {visible.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((category) => (
            <Card key={category.id} hover className="group flex items-center gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl text-xs font-semibold" style={{ backgroundColor: `${category.color || "#8b5cf6"}18`, color: category.color || "#8b5cf6" }}>{category.name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-xs font-medium">{category.name}</p><Badge>{category.question_count}</Badge></div>
                <p className="mt-1 truncate text-[9px] text-zinc-600">{category.published_count} published · {category.draft_count} drafts · /{category.slug}</p>
              </div>
              <div className="flex shrink-0">
                <button onClick={() => setEditor(category)} className="grid size-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-white/[.06] hover:text-white" aria-label={`Edit ${category.name}`}><Pencil size={13} /></button>
                <button disabled={deleting === category.id} onClick={() => void remove(category)} className="grid size-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40" aria-label={`Delete ${category.name}`}>{deleting === category.id ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}</button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="grid min-h-64 place-items-center p-8 text-center">
          <div><FolderPlus size={30} className="mx-auto text-zinc-600" /><p className="mt-3 text-sm font-medium">{query ? "No matching categories" : "No categories yet"}</p><p className="mt-2 text-xs text-zinc-600">{query ? "Try a different search." : "Create the first category to start organizing questions."}</p></div>
        </Card>
      )}

      {editor !== null && (
        <CategoryEditor
          key={editor === "new" ? "new" : editor.id}
          category={editor === "new" ? null : editor}
          open
          onClose={() => setEditor(null)}
          onSaved={async (label) => {
            setEditor(null);
            setMessage(label);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function CategoryEditor({ category, open, onClose, onSaved }: {
  category: AdminCategory | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(Boolean(category));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CategoryInput = {
      name: String(form.get("name") || "").trim(),
      slug: String(form.get("slug") || "").trim().toLowerCase(),
      color: String(form.get("color") || "#8b5cf6"),
      icon: String(form.get("icon") || "Boxes").trim(),
      sort_order: Number(form.get("sort_order") || 0),
    };
    setSaving(true);
    setError("");
    try {
      if (category) await updateAdminCategory(category.id, input);
      else await createAdminCategory(input);
      await onSaved(category ? `${input.name} was updated.` : `${input.name} was created.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] max-h-[92vh] w-[calc(100%-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{category ? "Edit category" : "New category"}</Dialog.Title>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]"><X size={17} /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-xs text-zinc-500">Categories organize the question bank, quizzes, analytics and learning paths.</Dialog.Description>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Category name">
              <input
                name="name"
                required
                maxLength={60}
                defaultValue={category?.name || EMPTY_CATEGORY.name}
                className="admin-input"
                onChange={(event) => {
                  if (slugEdited) return;
                  const slug = event.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null;
                  if (slug) slug.value = toSlug(event.target.value);
                }}
              />
            </Field>
            <Field label="URL slug">
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={category?.slug || EMPTY_CATEGORY.slug} onChange={() => setSlugEdited(true)} className="admin-input" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand colour"><div className="flex gap-2"><input name="color" type="color" defaultValue={category?.color || EMPTY_CATEGORY.color} className="h-12 w-14 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" /><span className="admin-input flex items-center text-xs text-zinc-500">Card accent</span></div></Field>
              <Field label="Sort order"><input name="sort_order" type="number" min={0} max={9999} defaultValue={category?.sort_order ?? EMPTY_CATEGORY.sort_order} className="admin-input" /></Field>
            </div>
            <Field label="Icon key"><input name="icon" defaultValue={category?.icon || EMPTY_CATEGORY.icon} className="admin-input" placeholder="Boxes" /></Field>
            {category && category.question_count > 0 && <p className="rounded-xl border border-cyan-400/15 bg-cyan-400/[.05] p-3 text-xs text-cyan-300">This category currently contains {category.question_count} questions. Changing its name or slug will not remove them.</p>}
            {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-xs text-rose-300" role="alert">{error}</p>}
            <div className="flex justify-end gap-2 pt-2"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit" disabled={saving}>{saving && <LoaderCircle size={14} className="animate-spin" />}{category ? "Save changes" : "Create category"}</Button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-medium text-zinc-500">{label}</span>{children}</label>;
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
