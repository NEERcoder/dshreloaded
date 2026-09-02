import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import PageShell from "../components/PageShell";
import {
  deleteOpportunity,
  deleteReview,
  deleteMentor,
  deleteVideo,
  deleteTeamMember,
  deleteTeamRole,
  getAdminOpportunities,
  getAdminReviews,
  getAdminMentors,
  getAdminVideos,
  getAdminTeamMembers,
  getAdminTeamRoles,
  getColleges,
  isCurrentUserAdmin,
  moderateReview,
  saveOpportunity,
  saveMentor,
  saveVideo,
  saveTeamMember,
  saveTeamRole,
  uploadMentorPhoto,
  type CollegeRecord,
  type OpportunityInput,
  type OpportunityRecord,
  type ReviewRecord,
  type MentorRecord,
  type VideoRecord,
  type TeamMemberRecord,
  type TeamRoleRecord,
} from "../lib/dataAccess";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { sanitizeYouTubeUrl, getYouTubeThumbnailUrl } from "../lib/urlSafety";

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
  status: "published",
  featured: false,
};

const blankMentor: Omit<MentorRecord, "id"> = {
  name: "",
  photoUrl: null,
  college: "",
  course: "",
  year: "",
  bio: "",
  role: "Senior Mentor",
  expertise: "",
  profileUrl: null,
  contactUrl: null,
  active: true,
  sortOrder: 0,
};

const blankVideo: Omit<VideoRecord, "id"> = {
  title: "",
  youtubeUrl: "",
  thumbnail: null,
  category: "college_review",
  collegeId: null,
  college: null,
  description: "",
  duration: "",
  featured: false,
  active: true,
  sortOrder: 0,
  publishedAt: null,
};

const blankRole: Omit<TeamRoleRecord, "id"> = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  responsibilities: [],
  requirements: [],
  benefits: [],
  workMode: "Remote · Part-time",
  duration: "3 Months",
  googleFormUrl: "",
  isOpen: true,
};

const blankMember: Omit<TeamMemberRecord, "id"> = {
  name: "",
  photoUrl: null,
  role: "",
  college: "",
  course: "",
  shortBio: "",
  linkedinUrl: null,
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(isSupabaseConfigured);
  const [authorized, setAuthorized] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      setAuthorized(true);
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

  if (checking) {
    return (
      <PageShell title="Admin | DU Science Hub" backgroundPreset="admin">
        <div className="container-px py-24 text-center text-sm text-ink-500">Checking admin access…</div>
      </PageShell>
    );
  }

  // When Supabase is configured: require login and RBAC
  if (isSupabaseConfigured) {
    if (!session) {
      return <AdminLogin />;
    }
    if (!authorized) {
      return <NotAuthorized />;
    }
  }

  return <AdminDashboard email={session?.user.email || "Local Developer (Development Mode)"} />;
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

  return (
    <PageShell title="Admin sign in | DU Science Hub" backgroundPreset="admin">
      <section className="container-px py-20 sm:py-28">
        <div className="mx-auto max-w-md">
          <p className="eyebrow">Protected workspace</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">Admin sign in</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            Use a Supabase Auth account with an admin role.
          </p>
          <form onSubmit={submit} className="card mt-8 p-6">
            <label className="field-label" htmlFor="admin-email">Email</label>
            <input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
            <label className="field-label mt-4" htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
            <button disabled={submitting} className="btn-secondary mt-5 w-full disabled:opacity-60">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            {message && <p role="alert" className="mt-3 text-sm font-semibold text-brand-red">{message}</p>}
          </form>
        </div>
      </section>
    </PageShell>
  );
}

function NotAuthorized() {
  return (
    <PageShell title="Admin access denied | DU Science Hub" backgroundPreset="admin">
      <section className="container-px py-20 sm:py-28">
        <p className="eyebrow">Protected workspace</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">Admin access is required.</h1>
        <p className="mt-5 max-w-xl leading-relaxed text-ink-500">
          This account is authenticated but is not present in the admin_users table.
        </p>
        <button className="btn-ghost mt-8" onClick={() => supabase?.auth.signOut()}>
          Sign out
        </button>
      </section>
    </PageShell>
  );
}

type TabType = "opportunities" | "reviews" | "mentors" | "videos" | "team_roles" | "team_members";

function AdminDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<TabType>("opportunities");
  const [colleges, setColleges] = useState<CollegeRecord[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [mentors, setMentors] = useState<MentorRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRoleRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [colRes, oppRes, revRes, menRes, vidRes, rolRes, memRes] = await Promise.all([
      getColleges(),
      getAdminOpportunities(),
      getAdminReviews(),
      getAdminMentors(),
      getAdminVideos(),
      getAdminTeamRoles(),
      getAdminTeamMembers(),
    ]);
    setColleges(colRes.data);
    setOpportunities(oppRes.data);
    setReviews(revRes.data);
    setMentors(menRes.data);
    setVideos(vidRes.data);
    setTeamRoles(rolRes.data);
    setTeamMembers(memRes.data);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <PageShell title="Admin Dashboard | DU Science Hub" backgroundPreset="admin">
      <div className="container-px py-10 sm:py-14">
        {!isSupabaseConfigured && (
          <div className="mb-8 rounded-2xl border border-brand-blue/30 bg-brand-blue-pale p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue px-2.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                  Local Development Admin Mode
                </span>
                <h3 className="mt-2 text-base font-bold text-ink-900">
                  Offline Development Store Active (localStorage)
                </h3>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-500">
                  You can create, edit, approve, and delete opportunities, reviews, mentors, videos, team roles, and team members. Changes will immediately update the live pages in this browser.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
              Keep the hub useful.
            </h1>
            <p className="mt-2 text-sm text-ink-500">{email}</p>
          </div>
          {isSupabaseConfigured && (
            <button className="btn-ghost self-start" onClick={() => supabase?.auth.signOut()}>
              Sign out
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit p-3 space-y-1">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-400">Content Management</p>
            {[
              { key: "opportunities" as TabType, label: "Opportunities", count: opportunities.length },
              { key: "reviews" as TabType, label: "Reviews (Moderation)", count: reviews.filter((r) => r.status === "pending").length },
              { key: "mentors" as TabType, label: "Mentors", count: mentors.length },
              { key: "videos" as TabType, label: "Videos (DU Unfiltered)", count: videos.length },
              { key: "team_roles" as TabType, label: "Team Roles", count: teamRoles.length },
              { key: "team_members" as TabType, label: "Team Members", count: teamMembers.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                  tab === key ? "bg-brand-blue-soft text-brand-blue font-bold" : "text-ink-700 hover:bg-surface-soft"
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${key === "reviews" && count > 0 ? "bg-brand-red-soft text-brand-red font-bold" : "bg-surface-border text-ink-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </aside>

          <div>
            {message && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-brand-blue-soft px-4 py-3 text-sm font-semibold text-brand-blue">
                <span>{message}</span>
                <button onClick={() => setMessage(null)} className="text-xs font-bold hover:underline">Dismiss</button>
              </div>
            )}

            {tab === "opportunities" && (
              <OpportunityManager
                items={opportunities}
                onSaved={(msg) => { setMessage(msg); refresh(); }}
              />
            )}
            {tab === "reviews" && (
              <ReviewManager
                reviews={reviews}
                onUpdated={(msg) => { setMessage(msg); refresh(); }}
              />
            )}
            {tab === "mentors" && (
              <MentorManager
                mentors={mentors}
                colleges={colleges}
                onSaved={(msg) => { setMessage(msg); refresh(); }}
              />
            )}
            {tab === "videos" && (
              <VideoManager
                videos={videos}
                colleges={colleges}
                onSaved={(msg) => { setMessage(msg); refresh(); }}
              />
            )}
            {tab === "team_roles" && (
              <TeamRoleManager
                roles={teamRoles}
                onSaved={(msg) => { setMessage(msg); refresh(); }}
              />
            )}
            {tab === "team_members" && (
              <TeamMemberManager
                members={teamMembers}
                onSaved={(msg) => { setMessage(msg); refresh(); }}
              />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// 1. OPPORTUNITY MANAGER
function OpportunityManager({ items, onSaved }: { items: OpportunityRecord[]; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<OpportunityInput>(blankOpportunity);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [coursesText, setCoursesText] = useState("");

  function startEdit(item: OpportunityRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      organization: item.organization,
      category: item.category,
      description: item.description,
      eligibility: item.eligibility || "",
      field: item.field || "",
      eligibleCourses: item.eligibleCourses,
      location: item.location || "",
      mode: item.mode || "",
      stipend: item.stipend || "",
      duration: item.duration || "",
      deadline: item.deadline || "",
      applicationUrl: item.applicationUrl || "",
      imageUrl: item.imageUrl || "",
      status: item.status,
      featured: item.featured,
    });
    setCoursesText(item.eligibleCourses.join(", "));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload: OpportunityInput = {
      ...form,
      eligibleCourses: coursesText.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const result = await saveOpportunity(payload, editingId);
    if (result.error) {
      onSaved(result.error);
    } else {
      onSaved(editingId ? "Opportunity updated successfully." : "Opportunity created successfully.");
      setForm(blankOpportunity);
      setCoursesText("");
      setEditingId(undefined);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this opportunity?")) return;
    const result = await deleteOpportunity(id);
    onSaved(result.error || "Opportunity deleted.");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Content management</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Opportunities</h2>
        </div>
        <span className="text-sm text-ink-500">{items.length} total</span>
      </div>

      <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit Opportunity" : "Create New Opportunity"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field-input" placeholder="e.g. Research Intern" />
          </div>
          <div>
            <label className="field-label">Organization</label>
            <input required value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="field-input" placeholder="e.g. DU Science Forum" />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as OpportunityRecord["category"] })} className="field-input">
              <option value="internship">Internship</option>
              <option value="competition">Competition</option>
              <option value="research">Research</option>
              <option value="certification">Certification</option>
              <option value="job">Job</option>
              <option value="fellowship">Fellowship</option>
              <option value="scholarship">Scholarship</option>
            </select>
          </div>
          <div>
            <label className="field-label">Field / Domain</label>
            <input value={form.field || ""} onChange={(e) => setForm({ ...form, field: e.target.value })} className="field-input" placeholder="e.g. Physics / Data Science" />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="field-input" placeholder="e.g. Delhi / Remote" />
          </div>
          <div>
            <label className="field-label">Mode</label>
            <input value={form.mode || ""} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="field-input" placeholder="e.g. Remote, On-site, Hybrid" />
          </div>
          <div>
            <label className="field-label">Stipend / Award</label>
            <input value={form.stipend || ""} onChange={(e) => setForm({ ...form, stipend: e.target.value })} className="field-input" placeholder="e.g. ₹10,000 / month or Unpaid" />
          </div>
          <div>
            <label className="field-label">Duration</label>
            <input value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="field-input" placeholder="e.g. 2 Months" />
          </div>
          <div>
            <label className="field-label">Deadline</label>
            <input value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="field-input" placeholder="e.g. Rolling or 2026-04-15" />
          </div>
          <div>
            <label className="field-label">Application URL</label>
            <input type="url" value={form.applicationUrl || ""} onChange={(e) => setForm({ ...form, applicationUrl: e.target.value })} className="field-input" placeholder="https://..." />
          </div>
          <div>
            <label className="field-label">Eligible Courses (comma-separated)</label>
            <input value={coursesText} onChange={(e) => setCoursesText(e.target.value)} className="field-input" placeholder="BSc Physics, BSc Chem, BTech" />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OpportunityRecord["status"] })} className="field-input">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <label className="field-label mt-4">Description</label>
        <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field-input min-h-24" placeholder="Detailed description..." />

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Mark as Featured Opportunity
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-secondary">{editingId ? "Update Opportunity" : "Create Opportunity"}</button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditingId(undefined); setForm(blankOpportunity); setCoursesText(""); }}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand-blue-soft px-2 py-1 text-xs font-bold uppercase text-brand-blue">{item.category}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === "published" ? "bg-brand-red-soft text-brand-red" : "bg-surface-border text-ink-500"}`}>
                  {item.status}
                </span>
                {item.featured && <span className="text-xs font-bold text-brand-red">★ Featured</span>}
              </div>
              <h3 className="mt-2 font-bold text-ink-900">{item.title}</h3>
              <p className="text-sm text-ink-500">{item.organization} · {item.location || "Remote"}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost px-3 py-2 text-xs" onClick={() => startEdit(item)}>Edit</button>
              <button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => remove(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. REVIEW MANAGER (MODERATION)
function ReviewManager({ reviews, onUpdated }: { reviews: ReviewRecord[]; onUpdated: (msg: string) => void }) {
  async function updateStatus(id: string, status: "approved" | "rejected") {
    const result = await moderateReview(id, status);
    onUpdated(result.error || `Review marked as ${status}.`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this review?")) return;
    const result = await deleteReview(id);
    onUpdated(result.error || "Review deleted.");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Moderation</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Student Reviews</h2>
        </div>
        <span className="text-sm text-ink-500">{reviews.length} total</span>
      </div>
      <p className="mt-2 text-sm text-ink-500">
        Approve, reject, or delete submitted reviews. Only approved reviews display publicly on college pages.
      </p>

      <div className="mt-6 space-y-3">
        {reviews.length ? (
          reviews.map((review) => (
            <article className="card p-5" key={review.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink-900">{review.name}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      review.status === "approved" ? "bg-brand-blue-soft text-brand-blue" : review.status === "pending" ? "bg-brand-red-soft text-brand-red" : "bg-surface-border text-ink-500"
                    }`}>
                      {review.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    {review.collegeName || review.collegeId} · {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} · {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{review.review}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {review.status !== "approved" && (
                    <button className="btn-outline-blue px-3 py-1.5 text-xs" onClick={() => updateStatus(review.id, "approved")}>
                      Approve
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => updateStatus(review.id, "rejected")}>
                      Reject
                    </button>
                  )}
                  <button className="btn-ghost px-3 py-1.5 text-xs text-brand-red" onClick={() => remove(review.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="card border-dashed p-8 text-center text-sm text-ink-500">No reviews found.</div>
        )}
      </div>
    </div>
  );
}

// 3. MENTOR MANAGER
function MentorManager({
  mentors,
  colleges,
  onSaved,
}: {
  mentors: MentorRecord[];
  colleges: CollegeRecord[];
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<Omit<MentorRecord, "id">>(blankMentor);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  function startEdit(item: MentorRecord) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      photoUrl: item.photoUrl,
      college: item.college || "",
      course: item.course || "",
      year: item.year || "",
      bio: item.bio || "",
      role: item.role || "Senior Mentor",
      expertise: item.expertise || "",
      profileUrl: item.profileUrl,
      contactUrl: item.contactUrl,
      active: item.active !== false,
      sortOrder: item.sortOrder ?? 0,
    });
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadMentorPhoto(file);
    setUploading(false);
    if (result.data) {
      setForm((prev) => ({ ...prev, photoUrl: result.data }));
      onSaved("Photo uploaded successfully.");
    } else {
      onSaved(result.error || "Failed to upload photo.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await saveMentor(form, editingId);
    if (result.error) {
      onSaved(result.error);
    } else {
      onSaved(editingId ? "Mentor updated successfully." : "Mentor added successfully.");
      setForm(blankMentor);
      setEditingId(undefined);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this mentor?")) return;
    const result = await deleteMentor(id);
    onSaved(result.error || "Mentor deleted.");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Mentors & Seniors</h2>
        </div>
        <span className="text-sm text-ink-500">{mentors.length} total</span>
      </div>

      <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit Mentor" : "Add New Mentor"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Full Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" placeholder="e.g. A. Khanna" />
          </div>
          <div>
            <label className="field-label">Affiliated College</label>
            <select
              value={form.college || ""}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              className="field-input"
            >
              <option value="">General DU / Not College Specific</option>
              {colleges.map((c) => (
                <option value={c.name} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Course</label>
            <input value={form.course || ""} onChange={(e) => setForm({ ...form, course: e.target.value })} className="field-input" placeholder="e.g. BSc (Hons) Physics" />
          </div>
          <div>
            <label className="field-label">Year / Status</label>
            <input value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value })} className="field-input" placeholder="e.g. 3rd Year or Alum" />
          </div>
          <div>
            <label className="field-label">Designation / Role</label>
            <input value={form.role || ""} onChange={(e) => setForm({ ...form, role: e.target.value })} className="field-input" placeholder="e.g. Senior Mentor" />
          </div>
          <div>
            <label className="field-label">Expertise / Guidance Areas</label>
            <input value={form.expertise || ""} onChange={(e) => setForm({ ...form, expertise: e.target.value })} className="field-input" placeholder="e.g. CUET prep, Research & Physics labs" />
          </div>
          <div>
            <label className="field-label">Photo (Upload image)</label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="field-input text-xs" />
            {uploading && <p className="mt-1 text-xs text-brand-blue font-semibold">Uploading photo…</p>}
            {form.photoUrl && <p className="mt-1 text-xs text-ink-500 truncate">Current photo: {form.photoUrl}</p>}
          </div>
          <div>
            <label className="field-label">Contact / Profile URL</label>
            <input type="url" value={form.contactUrl || ""} onChange={(e) => setForm({ ...form, contactUrl: e.target.value })} className="field-input" placeholder="https://linkedin.com/in/... or mailto:..." />
          </div>
          <div>
            <label className="field-label">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="field-input" />
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active (Visible on public pages)
            </label>
          </div>
        </div>
        <label className="field-label mt-4">Bio / Background</label>
        <textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="field-input min-h-20" placeholder="Brief factual mentor summary..." />
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary">{editingId ? "Update Mentor" : "Add Mentor"}</button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditingId(undefined); setForm(blankMentor); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {mentors.map((item) => (
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div className="flex items-center gap-4">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue font-bold">
                  {item.name.slice(0, 1)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink-900">{item.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.active ? "bg-brand-blue-soft text-brand-blue" : "bg-surface-border text-ink-500"}`}>
                    {item.active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-ink-400">Order: {item.sortOrder}</span>
                </div>
                <p className="text-xs text-ink-500">{[item.role, item.college, item.course, item.year].filter(Boolean).join(" · ")}</p>
                {item.expertise && <p className="mt-1 text-xs text-brand-blue font-semibold">{item.expertise}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost px-3 py-2 text-xs" onClick={() => startEdit(item)}>Edit</button>
              <button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => remove(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. VIDEO MANAGER
function VideoManager({
  videos,
  colleges,
  onSaved,
}: {
  videos: VideoRecord[];
  colleges: CollegeRecord[];
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<Omit<VideoRecord, "id">>(blankVideo);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | null>(null);

  function startEdit(item: VideoRecord) {
    setEditingId(item.id);
    setUrlError(null);
    setForm({
      title: item.title,
      youtubeUrl: item.youtubeUrl || "",
      thumbnail: item.thumbnail,
      category: item.category,
      collegeId: item.collegeId,
      college: item.college,
      description: item.description || "",
      duration: item.duration || "",
      featured: Boolean(item.featured),
      active: item.active !== false,
      sortOrder: item.sortOrder ?? 0,
      publishedAt: item.publishedAt || null,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setUrlError(null);
    if (form.youtubeUrl) {
      const safe = sanitizeYouTubeUrl(form.youtubeUrl);
      if (!safe) {
        setUrlError("Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)");
        return;
      }
    }
    // Auto-extract thumbnail if left blank
    const finalThumbnail = form.thumbnail || getYouTubeThumbnailUrl(form.youtubeUrl);
    const payload = {
      ...form,
      thumbnail: finalThumbnail,
    };
    const result = await saveVideo(payload, editingId);
    if (result.error) {
      onSaved(result.error);
    } else {
      onSaved(editingId ? "Video updated successfully." : "Video added successfully.");
      setForm(blankVideo);
      setEditingId(undefined);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this video?")) return;
    const result = await deleteVideo(id);
    onSaved(result.error || "Video deleted.");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Media</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">DU Unfiltered Videos</h2>
        </div>
        <span className="text-sm text-ink-500">{videos.length} total</span>
      </div>

      <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit Video" : "Add New Video"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field-input" placeholder="e.g. North Campus Walkthrough & Tour" />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field-input">
              <option value="college_review">College Review</option>
              <option value="campus_tour">Campus Tour</option>
              <option value="student_interview">Student Interview</option>
              <option value="podcast">Podcast</option>
              <option value="cuet_guidance">CUET Guidance</option>
              <option value="campus_story">Campus Story</option>
            </select>
          </div>
          <div>
            <label className="field-label">YouTube URL</label>
            <input
              type="url"
              required
              value={form.youtubeUrl || ""}
              onChange={(e) => {
                setForm({ ...form, youtubeUrl: e.target.value });
                setUrlError(null);
              }}
              className="field-input"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {urlError && <p className="mt-1 text-xs font-semibold text-brand-red">{urlError}</p>}
          </div>
          <div>
            <label className="field-label">Custom Thumbnail URL (Optional)</label>
            <input
              type="url"
              value={form.thumbnail || ""}
              onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              className="field-input"
              placeholder="Leave blank to auto-generate from YouTube"
            />
          </div>
          <div>
            <label className="field-label">Associated College (Optional)</label>
            <select
              value={form.collegeId || ""}
              onChange={(e) => {
                const selected = colleges.find((c) => c.id === e.target.value);
                setForm({ ...form, collegeId: e.target.value || null, college: selected ? selected.name : null });
              }}
              className="field-input"
            >
              <option value="">None / General DU Media</option>
              {colleges.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Duration</label>
            <input value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="field-input" placeholder="e.g. 12:40" />
          </div>
          <div>
            <label className="field-label">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="field-input" />
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Featured Video
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active (Visible publicly)
            </label>
          </div>
        </div>
        <label className="field-label mt-4">Description / Summary</label>
        <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field-input min-h-20" placeholder="Brief description of video contents..." />
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary">{editingId ? "Update Video" : "Add Video"}</button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditingId(undefined); setForm(blankVideo); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {videos.map((item) => (
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-brand-blue-soft px-2 py-1 text-xs font-bold uppercase text-brand-blue">
                  {item.category.replace(/_/g, " ")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.active ? "bg-brand-blue-soft text-brand-blue" : "bg-surface-border text-ink-500"}`}>
                  {item.active ? "Active" : "Inactive"}
                </span>
                {item.featured && <span className="text-xs font-bold text-brand-red">★ Featured</span>}
                {item.college && <span className="text-xs font-semibold text-ink-600">College: {item.college}</span>}
              </div>
              <h3 className="mt-2 font-bold text-ink-900">{item.title}</h3>
              {item.duration && <p className="text-xs text-ink-400">Duration: {item.duration} · Sort Order: {item.sortOrder}</p>}
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost px-3 py-2 text-xs" onClick={() => startEdit(item)}>Edit</button>
              <button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => remove(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. TEAM ROLE MANAGER
function TeamRoleManager({ roles, onSaved }: { roles: TeamRoleRecord[]; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<Omit<TeamRoleRecord, "id">>(blankRole);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [respText, setRespText] = useState("");
  const [reqText, setReqText] = useState("");
  const [benText, setBenText] = useState("");

  function startEdit(item: TeamRoleRecord) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      shortDescription: item.shortDescription,
      fullDescription: item.fullDescription,
      responsibilities: item.responsibilities,
      requirements: item.requirements,
      benefits: item.benefits,
      workMode: item.workMode,
      duration: item.duration,
      googleFormUrl: item.googleFormUrl,
      isOpen: item.isOpen,
    });
    setRespText(item.responsibilities.join("\n"));
    setReqText(item.requirements.join("\n"));
    setBenText(item.benefits.join("\n"));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload: Omit<TeamRoleRecord, "id"> = {
      ...form,
      responsibilities: respText.split("\n").map((s) => s.trim()).filter(Boolean),
      requirements: reqText.split("\n").map((s) => s.trim()).filter(Boolean),
      benefits: benText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const result = await saveTeamRole(payload, editingId);
    if (result.error) {
      onSaved(result.error);
    } else {
      onSaved(editingId ? "Role updated successfully." : "Role added successfully.");
      setForm(blankRole);
      setRespText("");
      setReqText("");
      setBenText("");
      setEditingId(undefined);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this role?")) return;
    const result = await deleteTeamRole(id);
    onSaved(result.error || "Role deleted.");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Hiring</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Team Positions</h2>
        </div>
        <span className="text-sm text-ink-500">{roles.length} total</span>
      </div>

      <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit Position" : "Add Position"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Role Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field-input" placeholder="e.g. Campus Correspondent" />
          </div>
          <div>
            <label className="field-label">Slug</label>
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="field-input" placeholder="e.g. campus-correspondent" />
          </div>
          <div>
            <label className="field-label">Work Mode</label>
            <input value={form.workMode || ""} onChange={(e) => setForm({ ...form, workMode: e.target.value })} className="field-input" placeholder="e.g. Remote · Part-time" />
          </div>
          <div>
            <label className="field-label">Duration</label>
            <input value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="field-input" placeholder="e.g. 3 Months" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Google Form Application URL</label>
            <input type="url" value={form.googleFormUrl || ""} onChange={(e) => setForm({ ...form, googleFormUrl: e.target.value })} className="field-input" placeholder="https://forms.google.com/..." />
          </div>
        </div>

        <label className="field-label mt-4">Short Description</label>
        <input required value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="field-input" />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Responsibilities (1 per line)</label>
            <textarea value={respText} onChange={(e) => setRespText(e.target.value)} className="field-input min-h-24" />
          </div>
          <div>
            <label className="field-label">Requirements (1 per line)</label>
            <textarea value={reqText} onChange={(e) => setReqText(e.target.value)} className="field-input min-h-24" />
          </div>
          <div>
            <label className="field-label">Benefits (1 per line)</label>
            <textarea value={benText} onChange={(e) => setBenText(e.target.value)} className="field-input min-h-24" />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input type="checkbox" checked={form.isOpen} onChange={(e) => setForm({ ...form, isOpen: e.target.checked })} />
          Open for Applications
        </label>

        <div className="mt-5 flex gap-2">
          <button className="btn-secondary">{editingId ? "Update Position" : "Add Position"}</button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditingId(undefined); setForm(blankRole); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {roles.map((item) => (
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.isOpen ? "bg-brand-red-soft text-brand-red" : "bg-surface-border text-ink-500"}`}>
                  {item.isOpen ? "Open" : "Closed"}
                </span>
                <h3 className="font-bold text-ink-900">{item.title}</h3>
              </div>
              <p className="mt-1 text-sm text-ink-500">{item.shortDescription}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost px-3 py-2 text-xs" onClick={() => startEdit(item)}>Edit</button>
              <button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => remove(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. TEAM MEMBER MANAGER
function TeamMemberManager({ members, onSaved }: { members: TeamMemberRecord[]; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<Omit<TeamMemberRecord, "id">>(blankMember);
  const [editingId, setEditingId] = useState<string | undefined>();

  function startEdit(item: TeamMemberRecord) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      photoUrl: item.photoUrl,
      role: item.role || "",
      college: item.college || "",
      course: item.course || "",
      shortBio: item.shortBio || "",
      linkedinUrl: item.linkedinUrl,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await saveTeamMember(form, editingId);
    if (result.error) {
      onSaved(result.error);
    } else {
      onSaved(editingId ? "Team member updated successfully." : "Team member added successfully.");
      setForm(blankMember);
      setEditingId(undefined);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this team member?")) return;
    const result = await deleteTeamMember(id);
    onSaved(result.error || "Team member deleted.");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Team</p>
          <h2 className="mt-2 text-2xl font-extrabold text-ink-900">Contributors & Team</h2>
        </div>
        <span className="text-sm text-ink-500">{members.length} total</span>
      </div>

      <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-ink-900">{editingId ? "Edit Contributor" : "Add Contributor"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" placeholder="e.g. Student Lead" />
          </div>
          <div>
            <label className="field-label">Role</label>
            <input value={form.role || ""} onChange={(e) => setForm({ ...form, role: e.target.value })} className="field-input" placeholder="e.g. Content Writer" />
          </div>
          <div>
            <label className="field-label">College</label>
            <input value={form.college || ""} onChange={(e) => setForm({ ...form, college: e.target.value })} className="field-input" placeholder="e.g. Hans Raj College" />
          </div>
          <div>
            <label className="field-label">Course</label>
            <input value={form.course || ""} onChange={(e) => setForm({ ...form, course: e.target.value })} className="field-input" placeholder="e.g. BSc Physics" />
          </div>
        </div>
        <label className="field-label mt-4">Short Bio</label>
        <textarea value={form.shortBio || ""} onChange={(e) => setForm({ ...form, shortBio: e.target.value })} className="field-input min-h-20" placeholder="Short bio..." />
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary">{editingId ? "Update Member" : "Add Member"}</button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditingId(undefined); setForm(blankMember); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {members.map((item) => (
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
            <div>
              <h3 className="font-bold text-ink-900">{item.name}</h3>
              <p className="text-sm text-ink-500">{item.role}{item.college ? ` · ${item.college}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost px-3 py-2 text-xs" onClick={() => startEdit(item)}>Edit</button>
              <button className="btn-ghost px-3 py-2 text-xs text-brand-red" onClick={() => remove(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
