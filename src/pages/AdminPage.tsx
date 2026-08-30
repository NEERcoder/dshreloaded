import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import PageShell from "../components/PageShell";
import {
  deleteOpportunity,
  deleteReview,
  getAdminOpportunities,
  getAdminReviews,
  isCurrentUserAdmin,
  moderateReview,
  saveOpportunity,
  type OpportunityInput,
  type OpportunityRecord,
  type ReviewRecord,
} from "../lib/dataAccess";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const blankOpportunity: OpportunityInput = {
  title: "",
  organization: "",
  category: "internship",
  description: "",
  eligibility: "",
  field: "",
  eligibleCourses: [],
  location: "",
  mode: "",
  stipend: "",
  duration: "",
  deadline: "",
  applicationUrl: "",
  imageUrl: "",
  status: "draft",
  featured: false,
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const adminResult = await isCurrentUserAdmin();
        setAuthorized(adminResult.data);
      }
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <AdminSetup />;
  }
  if (checking) {
    return <PageShell title="Admin | DU Science Hub"><div className="container-px py-24 text-center text-sm text-ink-500">Checking admin access…</div></PageShell>;
  }
  if (!session) {
    return <AdminLogin />;
  }
  if (!authorized) {
    return <NotAuthorized />;
  }
  return <AdminDashboard email={session.user.email || "Admin"} />;
}

function AdminSetup() {
  return <PageShell title="Admin setup | DU Science Hub"><section className="container-px py-20 sm:py-28"><p className="eyebrow">Protected workspace</p><h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-ink-900">Admin setup is almost ready.</h1><p className="mt-5 max-w-xl leading-relaxed text-ink-500">Supabase Auth, database tables and row-level security are wired into the application. Add the publishable Supabase URL and anon key to the environment to enable admin sign-in. No password is stored in this codebase.</p><a href="/" className="btn-secondary mt-8">Back to home</a></section></PageShell>;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setMessage(null);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (result.error) setMessage(result.error.message);
  }

  return <PageShell title="Admin sign in | DU Science Hub"><section className="container-px py-20 sm:py-28"><div className="mx-auto max-w-md"><p className="eyebrow">Protected workspace</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">Admin sign in</h1><p className="mt-4 text-sm leading-relaxed text-ink-500">Use a Supabase Auth account with an admin role. There are no hardcoded credentials.</p><form onSubmit={submit} className="card mt-8 p-6"><label className="field-label" htmlFor="admin-email">Email</label><input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" /><label className="field-label mt-4" htmlFor="admin-password">Password</label><input id="admin-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" /><button disabled={submitting} className="btn-secondary mt-5 w-full disabled:opacity-60">{submitting ? "Signing in…" : "Sign in"}</button>{message && <p role="alert" className="mt-3 text-sm font-semibold text-brand-red">{message}</p>}</form></div></section></PageShell>;
}

function NotAuthorized() {
  return <PageShell title="Admin access denied | DU Science Hub"><section className="container-px py-20 sm:py-28"><p className="eyebrow">Protected workspace</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">Admin access is required.</h1><p className="mt-5 max-w-xl leading-relaxed text-ink-500">This Supabase account is authenticated but is not present in the admin_users mapping. Ask an existing administrator to grant access.</p><button className="btn-ghost mt-8" onClick={() => supabase?.auth.signOut()}>Sign out</button></section></PageShell>;
}

function AdminDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<"opportunities" | "reviews">("opportunities");
  const [items, setItems] = useState<OpportunityRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [form, setForm] = useState<OpportunityInput>(blankOpportunity);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [opportunityResult, reviewResult] = await Promise.all([getAdminOpportunities(), getAdminReviews()]);
    setItems(opportunityResult.data);
    setReviews(reviewResult.data);
    setMessage(opportunityResult.error || reviewResult.error);
  }

  useEffect(() => { refresh(); }, []);

  function edit(item: OpportunityRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title, organization: item.organization, category: item.category, description: item.description,
      eligibility: item.eligibility || "", field: item.field || "", eligibleCourses: item.eligibleCourses, location: item.location || "",
      mode: item.mode || "", stipend: item.stipend || "", duration: item.duration || "", deadline: item.deadline || "",
      applicationUrl: item.applicationUrl || "", imageUrl: item.imageUrl || "", status: item.status, featured: item.featured,
    });
    setTab("opportunities");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await saveOpportunity(form, editingId);
    if (result.error) setMessage(result.error);
    else {
      setMessage(editingId ? "Opportunity updated." : "Opportunity created.");
      setForm(blankOpportunity);
      setEditingId(undefined);
      refresh();
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this opportunity?")) return;
    const result = await deleteOpportunity(id);
    setMessage(result.error || "Opportunity deleted.");
    refresh();
  }

  async function changeReview(id: string, status: "approved" | "rejected") {
    const result = await moderateReview(id, status);
    setMessage(result.error || `Review ${status}.`);
    refresh();
  }

  async function removeReview(id: string) {
    if (!window.confirm("Delete this review?")) return;
    const result = await deleteReview(id);
    setMessage(result.error || "Review deleted.");
    refresh();
  }

  return <PageShell title="Admin dashboard | DU Science Hub"><div className="container-px py-10 sm:py-14"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Admin workspace</p><h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">Keep the hub useful.</h1><p className="mt-2 text-sm text-ink-500">{email}</p></div><button className="btn-ghost self-start" onClick={() => supabase?.auth.signOut()}>Sign out</button></div><div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]"><aside className="card h-fit p-3"><p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-400">Dashboard</p>{["Overview", "Opportunities", "Reviews", "Mentors", "Team Members", "Videos", "Settings"].map((label) => <button key={label} onClick={() => (label === "Opportunities" || label === "Reviews") && setTab(label.toLowerCase() as "opportunities" | "reviews")} className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${tab === label.toLowerCase() ? "bg-brand-blue-soft text-brand-blue" : "text-ink-700 hover:bg-surface-soft"} ${label !== "Opportunities" && label !== "Reviews" ? "cursor-default opacity-50" : ""}`}>{label}</button>)}</aside><div>{message && <p className="mb-4 rounded-xl bg-brand-blue-soft px-4 py-3 text-sm font-semibold text-brand-blue" role="status">{message}</p>}{tab === "opportunities" ? <OpportunityManager items={items} form={form} setForm={setForm} editingId={editingId} setEditingId={setEditingId} onSubmit={submit} onEdit={edit} onDelete={remove} /> : <ReviewManager reviews={reviews} onApprove={(id) => changeReview(id, "approved")} onReject={(id) => changeReview(id, "rejected")} onDelete={removeReview} />}</div></div></div></PageShell>;
}

function OpportunityManager({ items, form, setForm, editingId, setEditingId, onSubmit, onEdit, onDelete }: { items: OpportunityRecord[]; form: OpportunityInput; setForm: (value: OpportunityInput) => void; editingId?: string; setEditingId: (id?: string) => void; onSubmit: (event: FormEvent) => void; onEdit: (item: OpportunityRecord) => void; onDelete: (id: string) => void }) {
  const field = (key: keyof OpportunityInput, value: string | boolean) => setForm({ ...form, [key]: value });
  return <div><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Content management</p><h2 className="mt-2 text-2xl font-extrabold text-ink-900">Opportunities</h2></div><span className="text-sm text-ink-500">{items.length} total</span></div><form onSubmit={onSubmit} className="card mt-6 p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Title</label><input required value={form.title} onChange={(event) => field("title", event.target.value)} className="field-input" /></div><div><label className="field-label">Organization</label><input required value={form.organization} onChange={(event) => field("organization", event.target.value)} className="field-input" /></div><div><label className="field-label">Category</label><select value={form.category} onChange={(event) => field("category", event.target.value)} className="field-input"><option value="internship">Internship</option><option value="competition">Competition</option><option value="research">Research</option><option value="certification">Certification</option></select></div><div><label className="field-label">Field</label><input value={form.field || ""} onChange={(event) => field("field", event.target.value)} className="field-input" /></div><div><label className="field-label">Location</label><input value={form.location || ""} onChange={(event) => field("location", event.target.value)} className="field-input" /></div><div><label className="field-label">Mode</label><input value={form.mode || ""} onChange={(event) => field("mode", event.target.value)} className="field-input" placeholder="Remote, On-site or Hybrid" /></div><div><label className="field-label">Deadline</label><input type="date" value={form.deadline || ""} onChange={(event) => field("deadline", event.target.value)} className="field-input" /></div><div><label className="field-label">Stipend</label><input value={form.stipend || ""} onChange={(event) => field("stipend", event.target.value)} className="field-input" /></div><div><label className="field-label">Application URL</label><input type="url" value={form.applicationUrl || ""} onChange={(event) => field("applicationUrl", event.target.value)} className="field-input" /></div><div><label className="field-label">Status</label><select value={form.status} onChange={(event) => field("status", event.target.value)} className="field-input"><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></div></div><label className="field-label mt-4">Description</label><textarea required value={form.description} onChange={(event) => field("description", event.target.value)} className="field-input min-h-28" /><label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-700"><input type="checkbox" checked={form.featured} onChange={(event) => field("featured", event.target.checked)} /> Mark as featured</label><div className="mt-5 flex flex-wrap gap-2"><button className="btn-secondary">{editingId ? "Update opportunity" : "Create opportunity"}</button>{editingId && <button type="button" className="btn-ghost" onClick={() => { setEditingId(); setForm(blankOpportunity); }}>Cancel edit</button>}</div></form><div className="mt-6 space-y-3">{items.map((item) => <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-brand-blue-soft px-2 py-1 text-xs font-bold uppercase text-brand-blue">{item.category}</span><span className="text-xs font-semibold text-ink-400">{item.status}</span></div><h3 className="mt-2 font-bold text-ink-900">{item.title}</h3><p className="text-sm text-ink-500">{item.organization}</p></div><div className="flex gap-2"><button className="btn-ghost px-3 py-2 text-xs" onClick={() => onEdit(item)}>Edit</button><button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => onDelete(item.id)}>Delete</button></div></div>)}</div></div>;
}

function ReviewManager({ reviews, onApprove, onReject, onDelete }: { reviews: ReviewRecord[]; onApprove: (id: string) => void; onReject: (id: string) => void; onDelete: (id: string) => void }) {
  return <div><p className="eyebrow">Moderation</p><h2 className="mt-2 text-2xl font-extrabold text-ink-900">Reviews</h2><p className="mt-2 text-sm text-ink-500">Approve, reject or delete anonymous submissions. Only approved reviews are public.</p><div className="mt-6 space-y-3">{reviews.length ? reviews.map((review) => <article className="card p-5" key={review.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-ink-900">{review.name}</h3><span className="rounded-full bg-surface-soft px-2 py-1 text-xs font-semibold text-ink-500">{review.status}</span></div><p className="mt-1 text-xs text-ink-400">{review.collegeName || "College"} · {"★".repeat(review.rating)}</p><p className="mt-3 text-sm leading-relaxed text-ink-600">{review.review}</p></div><div className="flex shrink-0 gap-2">{review.status !== "approved" && <button className="btn-outline-blue px-3 py-2 text-xs" onClick={() => onApprove(review.id)}>Approve</button>}{review.status !== "rejected" && <button className="btn-ghost px-3 py-2 text-xs" onClick={() => onReject(review.id)}>Reject</button>}<button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => onDelete(review.id)}>Delete</button></div></div></article>) : <div className="card border-dashed p-8 text-center text-sm text-ink-500">No reviews to moderate.</div>}</div></div>;
}
