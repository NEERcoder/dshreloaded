import { FormEvent, useState } from "react";
import Icon from "../Icon";
import EmptyState from "../home/EmptyState";
import { useAuth } from "../../context/AuthContext";
import {
  PULSE_POST_CATEGORIES,
  deletePulsePost,
  savePulsePost,
  setPulsePostStatus,
  uploadPulseImage,
  type PulsePostInput,
  type PulsePostRecord,
} from "../../lib/dataAccess";

const blankPulsePost: PulsePostInput = {
  title: "",
  summary: "",
  content: "",
  category: "announcement",
  imageUrl: "",
  externalUrl: "",
  status: "draft",
};

/** "opportunity_alert" -> "Opportunity Alert". Labels derive from the stored slug. */
function pulseCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pulseDateLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// PULSE MANAGER — admin-only editorial feed (public.pulse_posts, migration 009).
export default function PulseAdmin({
  items,
  onSaved,
}: {
  items: PulsePostRecord[];
  onSaved: (msg: string) => void;
}) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState<PulsePostInput>(blankPulsePost);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [coverUploading, setCoverUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const result = await uploadPulseImage(file);
    setCoverUploading(false);
    if (result.data) {
      setForm((prev) => ({ ...prev, imageUrl: result.data! }));
      onSaved("Cover image uploaded successfully.");
    } else {
      onSaved(result.error || "Failed to upload cover image.");
    }
    event.target.value = "";
  }

  function startEdit(item: PulsePostRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary,
      content: item.content,
      category: item.category,
      imageUrl: item.imageUrl || "",
      externalUrl: item.externalUrl || "",
      status: item.status,
    });
  }

  function resetForm() {
    setEditingId(undefined);
    setForm(blankPulsePost);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await savePulsePost(form, editingId);
    if (result.error || !result.data) {
      onSaved(result.error || "Could not save this PULSE post.");
    } else {
      onSaved(editingId ? "PULSE post updated successfully." : "PULSE post created successfully.");
      resetForm();
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this PULSE post?")) return;
    setBusyId(id);
    const result = await deletePulsePost(id);
    setBusyId(null);
    if (!result.error && !result.data) {
      onSaved("Could not delete this PULSE post.");
      return;
    }
    if (!result.error && editingId === id) resetForm();
    onSaved(result.error || "PULSE post deleted.");
  }

  async function changeStatus(item: PulsePostRecord, status: "draft" | "published") {
    setBusyId(item.id);
    const result = await setPulsePostStatus(item.id, status);
    setBusyId(null);
    if (result.error || !result.data) {
      onSaved(result.error || "Could not change the status of this post.");
      return;
    }
    onSaved(status === "published" ? "PULSE post published." : "PULSE post moved back to draft.");
  }

  // Drafts only ever exist in this list; defend the section twice even though
  // AdminDashboard itself is already gated on isAdmin.
  if (!isAdmin) return null;

  const draftCount = items.filter((item) => item.status === "draft").length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">PULSE CMS</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">PULSE Posts</h2>
        </div>
        <span className="text-sm text-ink-500">
          {items.length} total{draftCount > 0 ? ` · ${draftCount} draft${draftCount === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-500">
        Drafts stay inside this page. Only published posts reach the homepage PULSE strip and the public
        /pulse feed.
      </p>

      <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit PULSE Post" : "Create New Post"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Title</label>
            <input
              required
              maxLength={180}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field-input"
              placeholder="e.g. Result day: who cleared the first round"
            />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as PulsePostInput["category"] })
              }
              className="field-input"
            >
              {PULSE_POST_CATEGORIES.map((category) => (
                <option value={category} key={category}>
                  {pulseCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as PulsePostInput["status"] })
              }
              className="field-input"
            >
              <option value="draft">Draft (hidden from public)</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">External URL (optional)</label>
            <input
              type="url"
              value={form.externalUrl || ""}
              onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
              className="field-input"
              placeholder="https://... — link out to the notice, form or article"
            />
          </div>
        </div>

        <label className="field-label mt-4">Summary</label>
        <textarea
          required
          maxLength={500}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          className="field-input min-h-20"
          placeholder="One or two lines shown on the card..."
        />

        <label className="field-label mt-4">Content</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="field-input min-h-40"
          placeholder="The full post as students should read it."
        />

        {/* Cover image upload */}
        <div className="mt-5">
          <p className="field-label">Cover Image</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
            {form.imageUrl ? (
              <div className="relative w-40 shrink-0">
                <img
                  src={form.imageUrl}
                  alt="Cover preview"
                  className="w-40 h-28 object-cover rounded-xl border border-surface-border shadow-soft"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: "" })}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-brand-red text-brand-navy flex items-center justify-center shadow-soft"
                  title="Remove image"
                >
                  <Icon name="close" className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="w-40 h-28 shrink-0 rounded-xl border-2 border-dashed border-surface-border bg-surface-soft flex flex-col items-center justify-center gap-1 text-xs text-ink-500">
                <Icon name="image" className="h-6 w-6" />
                No cover
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label
                className={`btn-ghost cursor-pointer text-xs ${coverUploading ? "opacity-60 pointer-events-none" : ""}`}
              >
                {coverUploading ? (
                  <>
                    <Icon name="loader" className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Icon name="upload" className="h-4 w-4" /> {form.imageUrl ? "Replace Cover" : "Upload Cover"}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCoverUpload}
                  disabled={coverUploading}
                />
              </label>
              <p className="text-xs text-ink-500">Or paste a URL below</p>
              <input
                type="url"
                value={form.imageUrl || ""}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="field-input text-xs"
                placeholder="https://... (optional)"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-secondary">{editingId ? "Update Post" : "Create Post"}</button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {items.length === 0 ? (
          <EmptyState
            icon="book"
            title="No PULSE posts yet."
            description="Nothing has been written into the PULSE table, so the public feed is empty too. Use the form above to publish the first post."
          />
        ) : (
          items.map((item) => {
            const published = item.status === "published";
            const publishedOn = pulseDateLabel(item.publishedAt);
            const isBusy = busyId === item.id;
            return (
              <div
                className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={item.id}
              >
                <div className="flex min-w-0 items-center gap-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-12 w-16 shrink-0 rounded-xl border border-surface-border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-soft text-ink-400">
                      <Icon name="image" className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-brand-blue-soft px-2 py-1 text-xs font-bold uppercase text-brand-blue">
                        {pulseCategoryLabel(item.category)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          published ? "bg-brand-red-soft text-brand-red-ink" : "bg-surface-border text-ink-500"
                        }`}
                      >
                        {published ? "Published" : "Draft"}
                      </span>
                      {editingId === item.id && (
                        <span className="text-xs font-bold text-brand-blue">Editing</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-bold text-ink-900">{item.title}</h3>
                    <p className="text-xs text-ink-500">
                      {published && publishedOn
                        ? `Published ${publishedOn}`
                        : published
                          ? "Published (no date recorded)"
                          : "Not published yet"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    className="btn-ghost px-3 py-2 text-xs"
                    onClick={() => startEdit(item)}
                    disabled={isBusy}
                  >
                    <Icon name="pen" className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    className={`btn-ghost px-3 py-2 text-xs ${published ? "" : "text-brand-blue"}`}
                    onClick={() => changeStatus(item, published ? "draft" : "published")}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <>
                        <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> Working…
                      </>
                    ) : published ? (
                      <>
                        <Icon name="close" className="h-3.5 w-3.5" /> Unpublish
                      </>
                    ) : (
                      <>
                        <Icon name="check-circle" className="h-3.5 w-3.5" /> Publish
                      </>
                    )}
                  </button>
                  <button
                    className="btn-ghost px-3 py-2 text-xs text-brand-red-ink"
                    onClick={() => remove(item.id)}
                    disabled={isBusy}
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
