import { supabase } from "./supabase";

export type CollegeRecord = {
  id: string;
  slug: string;
  name: string;
  campus: string;
  location: string;
  academicAreas: string[];
  type: string;
  courses: string[];
  about: string | null;
  heroImageUrl: string | null;
  createdAt: string;
};

export type ReviewRecord = {
  id: string;
  collegeId: string;
  collegeName?: string;
  name: string;
  rating: number;
  review: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
};

export type MentorRecord = {
  id: string;
  name: string;
  photoUrl: string | null;
  college: string | null;
  course: string | null;
  year: string | null;
  bio: string | null;
  role: string | null;
  expertise: string | null;
  profileUrl: string | null;
  contactUrl: string | null;
};

export type VideoRecord = {
  id: string;
  title: string;
  youtubeUrl: string | null;
  thumbnail: string | null;
  category: string;
  collegeId: string | null;
  college: string | null;
  description: string | null;
  duration: string | null;
};

export type TeamMemberRecord = {
  id: string;
  name: string;
  photoUrl: string | null;
  role: string | null;
  college: string | null;
  course: string | null;
  shortBio: string | null;
  linkedinUrl: string | null;
};

export type TeamRoleRecord = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  workMode: string | null;
  duration: string | null;
  googleFormUrl: string | null;
  isOpen: boolean;
};

export type OpportunityRecord = {
  id: string;
  title: string;
  organization: string;
  category: "internship" | "competition" | "research" | "certification" | "job" | "fellowship" | "scholarship";
  description: string;
  eligibility: string | null;
  field: string | null;
  eligibleCourses: string[];
  location: string | null;
  mode: string | null;
  stipend: string | null;
  duration: string | null;
  deadline: string | null;
  applicationUrl: string | null;
  imageUrl: string | null;
  status: "draft" | "published" | "closed" | "archived";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityInput = Omit<
  OpportunityRecord,
  "id" | "createdAt" | "updatedAt"
>;

type DataResult<T> = { data: T; error: string | null; configured: boolean };

const unavailable = <T>(data: T): DataResult<T> => ({
  data,
  error: null,
  configured: false,
});

const failure = <T>(data: T, error: unknown): DataResult<T> => ({
  data,
  error: error instanceof Error ? error.message : "Unable to load this data.",
  configured: true,
});

const mapCollege = (row: Record<string, unknown>): CollegeRecord => ({
  id: String(row.id),
  slug: String(row.slug),
  name: String(row.name),
  campus: String(row.campus ?? ""),
  location: String(row.location ?? ""),
  academicAreas: Array.isArray(row.categories) ? row.categories.map(String) : [],
  type: String(row.college_type ?? ""),
  courses: Array.isArray(row.popular_courses) ? row.popular_courses.map(String) : [],
  about: row.short_description ? String(row.short_description) : null,
  heroImageUrl: row.hero_image_url ? String(row.hero_image_url) : null,
  createdAt: String(row.created_at ?? ""),
});

const mapReview = (row: Record<string, unknown>): ReviewRecord => ({
  id: String(row.id),
  collegeId: String(row.college_id),
  collegeName: row.college_name ? String(row.college_name) : undefined,
  name: String(row.name),
  rating: Number(row.rating),
  review: String(row.review),
  status: (row.status as ReviewRecord["status"]) ?? "pending",
  createdAt: String(row.created_at),
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

const mapTeamMember = (row: Record<string, unknown>): TeamMemberRecord => ({
  id: String(row.id),
  name: String(row.name),
  photoUrl: row.photo_url ? String(row.photo_url) : null,
  role: row.role ? String(row.role) : null,
  college: row.college ? String(row.college) : null,
  course: row.course ? String(row.course) : null,
  shortBio: row.short_bio ? String(row.short_bio) : null,
  linkedinUrl: row.linkedin_url ? String(row.linkedin_url) : null,
});

const mapTeamRole = (row: Record<string, unknown>): TeamRoleRecord => ({
  id: String(row.id),
  title: String(row.title),
  slug: String(row.slug),
  shortDescription: String(row.short_description ?? ""),
  fullDescription: String(row.full_description ?? ""),
  responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities.map(String) : [],
  requirements: Array.isArray(row.requirements) ? row.requirements.map(String) : [],
  benefits: Array.isArray(row.benefits) ? row.benefits.map(String) : [],
  workMode: row.work_mode ? String(row.work_mode) : null,
  duration: row.duration ? String(row.duration) : null,
  googleFormUrl: row.google_form_url ? String(row.google_form_url) : null,
  isOpen: Boolean(row.is_open),
});

const mapMentor = (row: Record<string, unknown>): MentorRecord => ({
  id: String(row.id),
  name: String(row.name),
  photoUrl: row.photo_url ? String(row.photo_url) : null,
  college: row.college ? String(row.college) : null,
  course: row.course ? String(row.course) : null,
  year: row.year ? String(row.year) : null,
  bio: row.bio ? String(row.bio) : null,
  role: row.designation ? String(row.designation) : null,
  expertise: row.expertise ? String(row.expertise) : null,
  profileUrl: row.profile_url ? String(row.profile_url) : null,
  contactUrl: row.contact_url ? String(row.contact_url) : null,
});

const mapVideo = (row: Record<string, unknown>): VideoRecord => ({
  id: String(row.id),
  title: String(row.title),
  youtubeUrl: row.youtube_url ? String(row.youtube_url) : null,
  thumbnail: row.thumbnail_url ? String(row.thumbnail_url) : null,
  category: String(row.category),
  collegeId: row.college_id ? String(row.college_id) : null,
  college: (row.colleges as { name?: string } | null)?.name || null,
  description: row.description ? String(row.description) : null,
  duration: row.duration ? String(row.duration) : null,
});

const mapOpportunity = (row: Record<string, unknown>): OpportunityRecord => ({
  id: String(row.id),
  title: String(row.title),
  organization: String(row.organization),
  category: row.category as OpportunityRecord["category"],
  description: String(row.description ?? ""),
  eligibility: row.eligibility ? String(row.eligibility) : null,
  field: row.field ? String(row.field) : null,
  eligibleCourses: Array.isArray(row.eligible_courses) ? row.eligible_courses.map(String) : [],
  location: row.location ? String(row.location) : null,
  mode: row.mode ? String(row.mode) : null,
  stipend: row.stipend ? String(row.stipend) : null,
  duration: row.duration ? String(row.duration) : null,
  deadline: row.deadline ? String(row.deadline) : null,
  applicationUrl: row.application_url ? String(row.application_url) : null,
  imageUrl: row.image_url ? String(row.image_url) : null,
  status: (row.status as OpportunityRecord["status"]) ?? "draft",
  featured: Boolean(row.featured),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export async function getColleges(): Promise<DataResult<CollegeRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("colleges").select("*").order("name");
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapCollege), error: null, configured: true };
}

export async function getCollegeBySlug(slug: string): Promise<DataResult<CollegeRecord | null>> {
  if (!supabase) return unavailable(null);
  const result = await supabase.from("colleges").select("*").eq("slug", slug).maybeSingle();
  return result.error ? failure(null, result.error) : { data: result.data ? mapCollege(result.data) : null, error: null, configured: true };
}

export async function getReviewsByCollege(collegeId: string): Promise<DataResult<ReviewRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase
    .from("college_reviews")
    .select("*, colleges(name)")
    .eq("college_id", collegeId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (result.error) return failure([], result.error);
  return {
    data: (result.data ?? []).map((row) => ({
      ...mapReview(row),
      collegeName: (row.colleges as { name?: string } | null)?.name,
    })),
    error: null,
    configured: true,
  };
}

export async function createAnonymousReview(input: {
  collegeId: string;
  name: string;
  rating: number;
  review: string;
}): Promise<DataResult<ReviewRecord | null>> {
  if (!supabase) return unavailable(null);
  const result = await supabase
    .from("college_reviews")
    .insert({
      college_id: input.collegeId,
      name: input.name.trim(),
      rating: input.rating,
      review: input.review.trim(),
      status: "pending",
    })
    .select("*")
    .single();
  return result.error ? failure(null, result.error) : { data: result.data ? mapReview(result.data) : null, error: null, configured: true };
}

export async function getMentors(): Promise<DataResult<MentorRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("mentors").select("*").eq("active", true).order("sort_order").order("created_at");
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapMentor), error: null, configured: true };
}

export async function getVideos(): Promise<DataResult<VideoRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("videos").select("*, colleges(name)").eq("active", true).order("sort_order").order("created_at", { ascending: false });
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapVideo), error: null, configured: true };
}

export async function getVideosByCollege(collegeId: string): Promise<DataResult<VideoRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase
    .from("videos")
    .select("*, colleges(name)")
    .eq("college_id", collegeId)
    .eq("active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapVideo), error: null, configured: true };
}

export async function getMentorsByCollege(collegeName: string): Promise<DataResult<MentorRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase
    .from("mentors")
    .select("*")
    .eq("college", collegeName)
    .eq("active", true)
    .order("sort_order")
    .order("created_at");
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapMentor), error: null, configured: true };
}

export async function getTeamMembers(): Promise<DataResult<TeamMemberRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("team_members").select("*").eq("active", true).order("sort_order").order("created_at");
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapTeamMember), error: null, configured: true };
}

export async function getOpenTeamRoles(): Promise<DataResult<TeamRoleRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("team_roles").select("*").eq("is_open", true).order("sort_order").order("created_at");
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapTeamRole), error: null, configured: true };
}

export async function isCurrentUserAdmin(): Promise<DataResult<boolean>> {
  if (!supabase) return unavailable(false);
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) return failure(false, userError || new Error("No authenticated user."));
  const result = await supabase.from("admin_users").select("id").eq("user_id", userResult.user.id).maybeSingle();
  return result.error ? failure(false, result.error) : { data: Boolean(result.data), error: null, configured: true };
}

export async function getOpportunities(category?: OpportunityRecord["category"]): Promise<DataResult<OpportunityRecord[]>> {
  if (!supabase) return unavailable([]);
  let query = supabase.from("opportunities").select("*").eq("status", "published").order("featured", { ascending: false }).order("deadline");
  if (category) query = query.eq("category", category);
  const result = await query;
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapOpportunity), error: null, configured: true };
}

export async function getAdminOpportunities(): Promise<DataResult<OpportunityRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
  return result.error ? failure([], result.error) : { data: (result.data ?? []).map(mapOpportunity), error: null, configured: true };
}

export async function saveOpportunity(input: OpportunityInput, id?: string): Promise<DataResult<OpportunityRecord | null>> {
  if (!supabase) return unavailable(null);
  const payload = {
    title: input.title,
    organization: input.organization,
    category: input.category,
    description: input.description,
    eligibility: input.eligibility,
    field: input.field,
    eligible_courses: input.eligibleCourses,
    location: input.location,
    mode: input.mode,
    stipend: input.stipend,
    duration: input.duration,
    deadline: input.deadline,
    application_url: input.applicationUrl,
    image_url: input.imageUrl,
    status: input.status,
    featured: input.featured,
  };
  const result = id
    ? await supabase.from("opportunities").update(payload).eq("id", id).select("*").single()
    : await supabase.from("opportunities").insert(payload).select("*").single();
  return result.error ? failure(null, result.error) : { data: result.data ? mapOpportunity(result.data) : null, error: null, configured: true };
}

export async function deleteOpportunity(id: string): Promise<DataResult<boolean>> {
  if (!supabase) return unavailable(false);
  const result = await supabase.from("opportunities").delete().eq("id", id);
  return result.error ? failure(false, result.error) : { data: true, error: null, configured: true };
}

export async function getAdminReviews(): Promise<DataResult<ReviewRecord[]>> {
  if (!supabase) return unavailable([]);
  const result = await supabase.from("college_reviews").select("*, colleges(name)").order("created_at", { ascending: false });
  if (result.error) return failure([], result.error);
  return {
    data: (result.data ?? []).map((row) => ({
      ...mapReview(row),
      collegeName: (row.colleges as { name?: string } | null)?.name,
    })),
    error: null,
    configured: true,
  };
}

export async function moderateReview(id: string, status: "approved" | "rejected"): Promise<DataResult<boolean>> {
  if (!supabase) return unavailable(false);
  const result = await supabase.from("college_reviews").update({ status }).eq("id", id);
  return result.error ? failure(false, result.error) : { data: true, error: null, configured: true };
}

export async function deleteReview(id: string): Promise<DataResult<boolean>> {
  if (!supabase) return unavailable(false);
  const result = await supabase.from("college_reviews").delete().eq("id", id);
  return result.error ? failure(false, result.error) : { data: true, error: null, configured: true };
}

export async function submitGeneralApplication(email: string, file: File): Promise<DataResult<boolean>> {
  if (!supabase) return unavailable(false);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `general/${crypto.randomUUID()}-${safeName}`;
  const upload = await supabase.storage.from("general-applications").upload(filePath, file, { upsert: false });
  if (upload.error) return failure(false, upload.error);
  const insert = await supabase.from("general_applications").insert({
    email: email.trim(),
    cv_path: filePath,
    status: "new",
  });
  if (insert.error) return failure(false, insert.error);
  return { data: true, error: null, configured: true };
}
