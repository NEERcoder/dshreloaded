import { supabase, isSupabaseConfigured } from "./supabase";
import {
  LocalProvider,
  type CollegeRecord,
  type ReviewRecord,
  type MentorRecord,
  type VideoRecord,
  type TeamMemberRecord,
  type TeamRoleRecord,
  type OpportunityRecord,
  type OpportunityInput,
} from "./localProvider";

export type {
  CollegeRecord,
  ReviewRecord,
  MentorRecord,
  VideoRecord,
  TeamMemberRecord,
  TeamRoleRecord,
  OpportunityRecord,
  OpportunityInput,
};

export type DataResult<T> = { data: T; error: string | null; configured: boolean };

// ==========================================
// STUDENT PROFILES
// ==========================================
// public.profiles already exists in production with RLS enforcing
// user_id = auth.uid() ownership. This client never reads/writes user_id
// from caller input — it is always taken from the authenticated session.
export type ProfileRecord = {
  id: string;
  userId: string;
  fullName: string;
  collegeId: string;
  course: string;
  yearOfStudy: number;
  graduationYear: number;
  gender: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileInput = {
  fullName: string;
  collegeId: string;
  course: string;
  yearOfStudy: number;
  graduationYear: number;
  gender: string;
};

const localSuccess = <T>(data: T): DataResult<T> => ({
  data,
  error: null,
  configured: false,
});

const remoteSuccess = <T>(data: T): DataResult<T> => ({
  data,
  error: null,
  configured: true,
});

const failure = <T>(data: T, error: unknown): DataResult<T> => ({
  data,
  error:
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error && typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : "Unable to complete this request.",
  configured: isSupabaseConfigured,
});

// Row mapping helpers for Supabase
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
  profileUrl: row.contact_url ? String(row.contact_url) : null,
  contactUrl: row.contact_url ? String(row.contact_url) : null,
  active: row.active !== undefined ? Boolean(row.active) : true,
  sortOrder: Number(row.sort_order ?? 0),
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
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
  featured: Boolean(row.featured),
  active: row.active !== undefined ? Boolean(row.active) : true,
  sortOrder: Number(row.sort_order ?? 0),
  publishedAt: row.published_at ? String(row.published_at) : null,
  createdAt: row.created_at ? String(row.created_at) : undefined,
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
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
  teamFormationEnabled: Boolean(row.team_formation_enabled),
  minTeamSize: row.min_team_size != null ? Number(row.min_team_size) : null,
  maxTeamSize: row.max_team_size != null ? Number(row.max_team_size) : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const mapProfile = (row: Record<string, unknown>): ProfileRecord => ({
  id: String(row.id),
  userId: String(row.user_id),
  fullName: String(row.full_name ?? ""),
  collegeId: row.college_id ? String(row.college_id) : "",
  course: String(row.course ?? ""),
  yearOfStudy: Number(row.year_of_study ?? 0),
  graduationYear: Number(row.graduation_year ?? 0),
  gender: String(row.gender ?? ""),
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? row.created_at ?? ""),
});

// ==========================================
// COLLEGES
// ==========================================
export async function getColleges(): Promise<DataResult<CollegeRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase.from("colleges").select("*").order("name");
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapCollege));
      }
    } catch {
      // fallback to local on network error
    }
  }
  const localData = await LocalProvider.getColleges();
  return localSuccess(localData);
}

export async function getCollegeBySlug(slug: string): Promise<DataResult<CollegeRecord | null>> {
  if (supabase) {
    try {
      const result = await supabase.from("colleges").select("*").eq("slug", slug).maybeSingle();
      if (!result.error && result.data) {
        return remoteSuccess(mapCollege(result.data));
      }
    } catch {
      // fallback to local on network error
    }
  }
  const localCollege = await LocalProvider.getCollegeBySlug(slug);
  return localSuccess(localCollege);
}

// ==========================================
// REVIEWS
// ==========================================
export async function getReviewsByCollege(collegeId: string): Promise<DataResult<ReviewRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase
        .from("college_reviews")
        .select("*, colleges(name)")
        .eq("college_id", collegeId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (!result.error && result.data) {
        return remoteSuccess(
          result.data.map((row) => ({
            ...mapReview(row),
            collegeName: (row.colleges as { name?: string } | null)?.name,
          }))
        );
      }
    } catch {
      // fallback to local
    }
  }
  const localReviews = await LocalProvider.getReviewsByCollege(collegeId);
  return localSuccess(localReviews);
}

export async function getApprovedReviews(limit = 12): Promise<DataResult<ReviewRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase
        .from("college_reviews")
        .select("*, colleges(name, slug)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!result.error && result.data) {
        return remoteSuccess(
          result.data.map((row) => ({
            ...mapReview(row),
            collegeName: (row.colleges as { name?: string; slug?: string } | null)?.name,
            collegeSlug: (row.colleges as { name?: string; slug?: string } | null)?.slug,
          }))
        );
      }
    } catch {
      // fallback
    }
  }
  const allReviews = await LocalProvider.getAdminReviews();
  const approved = allReviews.filter((r) => r.status === "approved").slice(0, limit);
  return localSuccess(approved);
}

export async function createAnonymousReview(input: {
  collegeId: string;
  name: string;
  rating: number;
  review: string;
}): Promise<DataResult<ReviewRecord | null>> {
  if (supabase) {
    try {
      const result = await supabase.from("college_reviews").insert({
        college_id: input.collegeId,
        name: input.name.trim(),
        rating: input.rating,
        review: input.review.trim(),
        status: "pending",
      });
      if (result.error) return failure(null, result.error);
      return remoteSuccess(null);
    } catch (err) {
      return failure(null, err);
    }
  }
  const created = await LocalProvider.createAnonymousReview(input);
  return localSuccess(created);
}

export async function getAdminReviews(): Promise<DataResult<ReviewRecord[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure([], new Error("Admin access requires an authenticated Supabase backend."));
  }
  try {
    const result = await supabase.from("college_reviews").select("*, colleges(name)").order("created_at", { ascending: false });
    if (result.error) return failure([], result.error);
    return remoteSuccess(
      (result.data || []).map((row) => ({
        ...mapReview(row),
        collegeName: (row.colleges as { name?: string } | null)?.name,
      }))
    );
  } catch (err) {
    return failure([], err);
  }
}

export async function moderateReview(id: string, status: "approved" | "rejected"): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("college_reviews").update({ status }).eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function deleteReview(id: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("college_reviews").delete().eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

// ==========================================
// MENTORS
// ==========================================
export async function getMentors(): Promise<DataResult<MentorRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase.from("mentors").select("*").eq("active", true).order("sort_order").order("created_at");
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapMentor));
      }
    } catch {
      // fallback to local
    }
  }
  const localMentors = await LocalProvider.getMentors();
  return localSuccess(localMentors);
}

export async function getMentorsByCollege(collegeName: string): Promise<DataResult<MentorRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase.from("mentors").select("*").eq("college", collegeName).eq("active", true).order("sort_order").order("created_at");
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapMentor));
      }
    } catch {
      // fallback to local
    }
  }
  const localMentors = await LocalProvider.getMentorsByCollege(collegeName);
  return localSuccess(localMentors);
}

export async function getAdminMentors(): Promise<DataResult<MentorRecord[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure([], new Error("Admin access requires an authenticated Supabase backend."));
  }
  try {
    const result = await supabase.from("mentors").select("*").order("sort_order").order("created_at");
    if (result.error) return failure([], result.error);
    return remoteSuccess((result.data || []).map(mapMentor));
  } catch (err) {
    return failure([], err);
  }
}

export async function saveMentor(input: Omit<MentorRecord, "id">, id?: string): Promise<DataResult<MentorRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const payload = {
      name: input.name.trim(),
      photo_url: input.photoUrl,
      college: input.college,
      course: input.course,
      year: input.year,
      bio: input.bio,
      designation: input.role,
      expertise: input.expertise,
      profile_url: input.profileUrl,
      contact_url: input.contactUrl,
      active: input.active !== undefined ? input.active : true,
      sort_order: input.sortOrder !== undefined ? input.sortOrder : 0,
    };
    const result = id
      ? await supabase.from("mentors").update(payload).eq("id", id).select("*").single()
      : await supabase.from("mentors").insert(payload).select("*").single();
    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapMentor(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function deleteMentor(id: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("mentors").delete().eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function uploadMentorPhoto(file: File): Promise<DataResult<string | null>> {
  if (supabase) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `mentors/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("mentor-photos").upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upload.error) return failure(null, upload.error);
      const { data } = supabase.storage.from("mentor-photos").getPublicUrl(filePath);
      return remoteSuccess(data.publicUrl);
    } catch (err) {
      return failure(null, err);
    }
  }
  try {
    const localUrl = URL.createObjectURL(file);
    return localSuccess(localUrl);
  } catch {
    return localSuccess(null);
  }
}

// ==========================================
// VIDEOS
// ==========================================
export async function getVideos(): Promise<DataResult<VideoRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase
        .from("videos")
        .select("*, colleges(name)")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapVideo));
      }
    } catch {
      // fallback to local
    }
  }
  const localVideos = await LocalProvider.getVideos();
  return localSuccess(localVideos);
}

export async function getVideosByCollege(collegeId: string): Promise<DataResult<VideoRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase
        .from("videos")
        .select("*, colleges(name)")
        .eq("college_id", collegeId)
        .eq("active", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapVideo));
      }
    } catch {
      // fallback to local
    }
  }
  const localVideos = await LocalProvider.getVideosByCollege(collegeId);
  return localSuccess(localVideos);
}

export async function getAdminVideos(): Promise<DataResult<VideoRecord[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure([], new Error("Admin access requires an authenticated Supabase backend."));
  }
  try {
    const result = await supabase
      .from("videos")
      .select("*, colleges(name)")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (result.error) return failure([], result.error);
    return remoteSuccess((result.data || []).map(mapVideo));
  } catch (err) {
    return failure([], err);
  }
}

export async function saveVideo(input: Omit<VideoRecord, "id">, id?: string): Promise<DataResult<VideoRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const payload = {
      title: input.title.trim(),
      youtube_url: input.youtubeUrl,
      thumbnail_url: input.thumbnail,
      category: input.category,
      college_id: input.collegeId || null,
      description: input.description,
      duration: input.duration,
      featured: Boolean(input.featured),
      active: input.active !== undefined ? input.active : true,
      sort_order: input.sortOrder !== undefined ? input.sortOrder : 0,
    };
    const result = id
      ? await supabase.from("videos").update(payload).eq("id", id).select("*, colleges(name)").single()
      : await supabase.from("videos").insert(payload).select("*, colleges(name)").single();
    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapVideo(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function deleteVideo(id: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("videos").delete().eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

// ==========================================
// TEAM MEMBERS & ROLES
// ==========================================
export async function getTeamMembers(): Promise<DataResult<TeamMemberRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase.from("team_members").select("*").eq("active", true).order("sort_order").order("created_at");
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapTeamMember));
      }
    } catch {
      // fallback to local
    }
  }
  const localMembers = await LocalProvider.getTeamMembers();
  return localSuccess(localMembers);
}

export async function getAdminTeamMembers(): Promise<DataResult<TeamMemberRecord[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure([], new Error("Admin access requires an authenticated Supabase backend."));
  }
  try {
    const result = await supabase.from("team_members").select("*").order("sort_order").order("created_at");
    if (result.error) return failure([], result.error);
    return remoteSuccess((result.data || []).map(mapTeamMember));
  } catch (err) {
    return failure([], err);
  }
}

export async function saveTeamMember(input: Omit<TeamMemberRecord, "id">, id?: string): Promise<DataResult<TeamMemberRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const payload = {
      name: input.name,
      photo_url: input.photoUrl,
      role: input.role,
      college: input.college,
      course: input.course,
      short_bio: input.shortBio,
      linkedin_url: input.linkedinUrl,
    };
    const result = id
      ? await supabase.from("team_members").update(payload).eq("id", id).select("*").single()
      : await supabase.from("team_members").insert(payload).select("*").single();
    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapTeamMember(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function deleteTeamMember(id: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("team_members").delete().eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function getOpenTeamRoles(): Promise<DataResult<TeamRoleRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase.from("team_roles").select("*").eq("is_open", true).order("sort_order").order("created_at");
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapTeamRole));
      }
    } catch {
      // fallback to local
    }
  }
  const localRoles = await LocalProvider.getOpenTeamRoles();
  return localSuccess(localRoles);
}

export async function getAdminTeamRoles(): Promise<DataResult<TeamRoleRecord[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure([], new Error("Admin access requires an authenticated Supabase backend."));
  }
  try {
    const result = await supabase.from("team_roles").select("*").order("sort_order").order("created_at");
    if (result.error) return failure([], result.error);
    return remoteSuccess((result.data || []).map(mapTeamRole));
  } catch (err) {
    return failure([], err);
  }
}

export async function saveTeamRole(input: Omit<TeamRoleRecord, "id">, id?: string): Promise<DataResult<TeamRoleRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const payload = {
      title: input.title,
      slug: input.slug,
      short_description: input.shortDescription,
      full_description: input.fullDescription,
      responsibilities: input.responsibilities,
      requirements: input.requirements,
      benefits: input.benefits,
      work_mode: input.workMode,
      duration: input.duration,
      google_form_url: input.googleFormUrl,
      is_open: input.isOpen,
    };
    const result = id
      ? await supabase.from("team_roles").update(payload).eq("id", id).select("*").single()
      : await supabase.from("team_roles").insert(payload).select("*").single();
    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapTeamRole(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function deleteTeamRole(id: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("team_roles").delete().eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

// ==========================================
// OPPORTUNITIES
// ==========================================
export async function getOpportunities(category?: OpportunityRecord["category"]): Promise<DataResult<OpportunityRecord[]>> {
  if (supabase) {
    try {
      let query = supabase.from("opportunities").select("*").eq("status", "published").order("featured", { ascending: false }).order("deadline");
      if (category) query = query.eq("category", category);
      const result = await query;
      if (!result.error && result.data && result.data.length > 0) {
        return remoteSuccess(result.data.map(mapOpportunity));
      }
    } catch {
      // fallback to local
    }
  }
  const localOpportunities = await LocalProvider.getOpportunities(category);
  return localSuccess(localOpportunities);
}

export async function getOpportunityById(id: string): Promise<DataResult<OpportunityRecord | null>> {
  if (supabase) {
    try {
      const result = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
      if (!result.error && result.data) {
        return remoteSuccess(mapOpportunity(result.data));
      }
    } catch {
      // fallback to local
    }
  }
  const localOpp = await LocalProvider.getOpportunityById(id);
  return localSuccess(localOpp);
}

export async function getAdminOpportunities(): Promise<DataResult<OpportunityRecord[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure([], new Error("Admin access requires an authenticated Supabase backend."));
  }
  try {
    const result = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
    if (result.error) return failure([], result.error);
    return remoteSuccess((result.data || []).map(mapOpportunity));
  } catch (err) {
    return failure([], err);
  }
}

export async function saveOpportunity(input: OpportunityInput, id?: string): Promise<DataResult<OpportunityRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
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
      team_formation_enabled: input.teamFormationEnabled,
      min_team_size: input.minTeamSize ?? null,
      max_team_size: input.maxTeamSize ?? null,
    };
    const result = id
      ? await supabase.from("opportunities").update(payload).eq("id", id).select("*").single()
      : await supabase.from("opportunities").insert(payload).select("*").single();
    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapOpportunity(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function deleteOpportunity(id: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase.from("opportunities").delete().eq("id", id);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

// ==========================================
// OPPORTUNITY POSTER UPLOAD
// ==========================================
export async function uploadOpportunityPoster(file: File): Promise<DataResult<string | null>> {
  if (supabase) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `opportunities/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("opportunity-posters").upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upload.error) return failure(null, upload.error);
      const { data } = supabase.storage.from("opportunity-posters").getPublicUrl(filePath);
      return remoteSuccess(data.publicUrl);
    } catch (err) {
      return failure(null, err);
    }
  }
  try {
    return localSuccess(URL.createObjectURL(file));
  } catch {
    return localSuccess(null);
  }
}

// ==========================================
// COLLEGE IMAGE UPLOAD + SAVE
// ==========================================
export async function uploadCollegeImage(collegeId: string, file: File): Promise<DataResult<string | null>> {
  if (supabase) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `colleges/${collegeId}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("college-images").upload(filePath, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upload.error) return failure(null, upload.error);
      const { data } = supabase.storage.from("college-images").getPublicUrl(filePath);
      return remoteSuccess(data.publicUrl);
    } catch (err) {
      return failure(null, err);
    }
  }
  try {
    return localSuccess(URL.createObjectURL(file));
  } catch {
    return localSuccess(null);
  }
}

export async function saveCollegeImage(collegeId: string, heroImageUrl: string | null): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Unauthorized: Supabase admin authentication required."));
  }
  try {
    const result = await supabase
      .from("colleges")
      .update({ hero_image_url: heroImageUrl })
      .eq("id", collegeId);
    if (result.error) return failure(false, result.error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

// ==========================================
// COMPETITION TEAMS
// ==========================================

export type CompetitionTeamRecord = {
  id: string;
  competitionId: string;
  competitionTitle: string;
  name: string;
  inviteCode: string;
  captainUserId: string;
  status: "active" | "closed" | "disbanded";
  memberCount: number;
  members: CompetitionTeamMemberRecord[];
  createdAt: string;
  updatedAt: string;
};

export type CompetitionTeamMemberRecord = {
  id: string;
  teamId: string;
  userId: string;
  fullName: string;
  college: string | null;
  course: string | null;
  role: "captain" | "member";
  joinedAt: string;
};

/** Generate a short human-friendly invite code like DSH-7K29P */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusing O,0,I,1
  let code = "DSH-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Attempt to generate a code that doesn't already exist (up to 10 tries) */
async function generateUniqueInviteCode(): Promise<string> {
  if (!supabase) return generateInviteCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const { data } = await supabase
      .from("competition_teams")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  // Fallback: append timestamp segment for uniqueness
  return `DSH-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

const mapCompetitionMember = (row: Record<string, unknown>): CompetitionTeamMemberRecord => ({
  id: String(row.id),
  teamId: String(row.team_id),
  userId: String(row.user_id),
  fullName: (row.profiles as { full_name?: string } | null)?.full_name ?? "Student",
  college: (row.profiles as { college_id?: string } | null)?.college_id ?? null,
  course: (row.profiles as { course?: string } | null)?.course ?? null,
  role: (row.role as "captain" | "member") ?? "member",
  joinedAt: String(row.joined_at),
});

const mapTeam = (
  row: Record<string, unknown>,
  members: CompetitionTeamMemberRecord[] = []
): CompetitionTeamRecord => ({
  id: String(row.id),
  competitionId: String(row.competition_id),
  competitionTitle: (row.opportunities as { title?: string } | null)?.title ?? "",
  name: String(row.name),
  inviteCode: String(row.invite_code),
  captainUserId: String(row.captain_user_id),
  status: (row.status as CompetitionTeamRecord["status"]) ?? "active",
  memberCount: members.length,
  members,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export async function createCompetitionTeam(
  competitionId: string,
  teamName: string
): Promise<DataResult<CompetitionTeamRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Authentication required to create a team."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return failure(null, new Error("You must be signed in to create a team."));
    const userId = userRes.user.id;

    // Check competition exists and has team formation enabled
    const { data: opp, error: oppErr } = await supabase
      .from("opportunities")
      .select("id, title, team_formation_enabled, max_team_size, status")
      .eq("id", competitionId)
      .maybeSingle();
    if (oppErr || !opp) return failure(null, new Error("Competition not found."));
    if (!opp.team_formation_enabled) return failure(null, new Error("Team formation is not enabled for this competition."));
    if (opp.status !== "published") return failure(null, new Error("This competition is not currently active."));

    // Check student isn't already in a team for this competition
    const { data: existingMembership } = await supabase
      .from("competition_team_members")
      .select("team_id, competition_teams!inner(competition_id)")
      .eq("user_id", userId)
      .eq("competition_teams.competition_id", competitionId)
      .maybeSingle();
    if (existingMembership) return failure(null, new Error("You are already in a team for this competition."));

    const inviteCode = await generateUniqueInviteCode();

    // Insert team
    const { data: team, error: teamErr } = await supabase
      .from("competition_teams")
      .insert({
        competition_id: competitionId,
        name: teamName.trim(),
        invite_code: inviteCode,
        captain_user_id: userId,
        status: "active",
      })
      .select("*, opportunities(title)")
      .single();
    if (teamErr || !team) return failure(null, teamErr ?? new Error("Failed to create team."));

    // Add captain as a member
    await supabase.from("competition_team_members").insert({
      team_id: team.id,
      user_id: userId,
      role: "captain",
    });

    // Fetch members with profiles
    const { data: membersRaw } = await supabase
      .from("competition_team_members")
      .select("*, profiles(full_name, course, college_id)")
      .eq("team_id", team.id);
    const members = (membersRaw || []).map((r) => mapCompetitionMember(r as Record<string, unknown>));

    return remoteSuccess(mapTeam(team as Record<string, unknown>, members));
  } catch (err) {
    return failure(null, err);
  }
}

export async function getCompetitionTeam(teamId: string): Promise<DataResult<CompetitionTeamRecord | null>> {
  if (!supabase) return failure(null, new Error("Not connected."));
  try {
    const { data: team, error } = await supabase
      .from("competition_teams")
      .select("*, opportunities(title)")
      .eq("id", teamId)
      .maybeSingle();
    if (error) return failure(null, error);
    if (!team) return remoteSuccess(null);

    const { data: membersRaw } = await supabase
      .from("competition_team_members")
      .select("*, profiles(full_name, course, college_id)")
      .eq("team_id", teamId);
    const members = (membersRaw || []).map((r) => mapCompetitionMember(r as Record<string, unknown>));
    return remoteSuccess(mapTeam(team as Record<string, unknown>, members));
  } catch (err) {
    return failure(null, err);
  }
}

export async function getCompetitionTeamsForCompetition(
  competitionId: string
): Promise<DataResult<CompetitionTeamRecord[]>> {
  if (!supabase) return remoteSuccess([]);
  try {
    const { data: teams, error } = await supabase
      .from("competition_teams")
      .select("*, opportunities(title)")
      .eq("competition_id", competitionId)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) return failure([], error);
    const result: CompetitionTeamRecord[] = [];
    for (const team of teams || []) {
      const { data: membersRaw } = await supabase
        .from("competition_team_members")
        .select("*, profiles(full_name, course, college_id)")
        .eq("team_id", team.id);
      const members = (membersRaw || []).map((r) => mapCompetitionMember(r as Record<string, unknown>));
      result.push(mapTeam(team as Record<string, unknown>, members));
    }
    return remoteSuccess(result);
  } catch (err) {
    return failure([], err);
  }
}

export async function getMyCompetitionTeams(): Promise<DataResult<CompetitionTeamRecord[]>> {
  if (!supabase || !isSupabaseConfigured) return remoteSuccess([]);
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return remoteSuccess([]);
    const userId = userRes.user.id;

    const { data: memberships, error } = await supabase
      .from("competition_team_members")
      .select("team_id")
      .eq("user_id", userId);
    if (error) return failure([], error);
    if (!memberships?.length) return remoteSuccess([]);

    const teamIds = memberships.map((m: { team_id: string }) => m.team_id);
    const { data: teams, error: teamsErr } = await supabase
      .from("competition_teams")
      .select("*, opportunities(title)")
      .in("id", teamIds)
      .order("created_at", { ascending: false });
    if (teamsErr) return failure([], teamsErr);

    const result: CompetitionTeamRecord[] = [];
    for (const team of teams || []) {
      const { data: membersRaw } = await supabase
        .from("competition_team_members")
        .select("*, profiles(full_name, course, college_id)")
        .eq("team_id", team.id);
      const members = (membersRaw || []).map((r) => mapCompetitionMember(r as Record<string, unknown>));
      result.push(mapTeam(team as Record<string, unknown>, members));
    }
    return remoteSuccess(result);
  } catch (err) {
    return failure([], err);
  }
}

export async function joinCompetitionTeamByCode(
  inviteCode: string
): Promise<DataResult<CompetitionTeamRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Authentication required to join a team."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return failure(null, new Error("You must be signed in to join a team."));
    const userId = userRes.user.id;

    // Find team by code
    const { data: team, error: teamErr } = await supabase
      .from("competition_teams")
      .select("*, opportunities(title, team_formation_enabled, max_team_size, status)")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .maybeSingle();
    if (teamErr) return failure(null, teamErr);
    if (!team) return failure(null, new Error("Team code not found. Check the code and try again."));
    if (team.status !== "active") return failure(null, new Error("This team is no longer accepting members."));

    const opp = team.opportunities as { title: string; team_formation_enabled: boolean; max_team_size: number | null; status: string } | null;
    if (!opp?.team_formation_enabled) return failure(null, new Error("Team formation is not enabled for this competition."));
    if (opp?.status !== "published") return failure(null, new Error("This competition is no longer active."));

    // Check not already in a team for this competition
    const { data: existingMembership } = await supabase
      .from("competition_team_members")
      .select("team_id, competition_teams!inner(competition_id)")
      .eq("user_id", userId)
      .eq("competition_teams.competition_id", team.competition_id)
      .maybeSingle();
    if (existingMembership) return failure(null, new Error("You are already in a team for this competition."));

    // Check team capacity
    const { count } = await supabase
      .from("competition_team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);
    if (opp?.max_team_size && (count ?? 0) >= opp.max_team_size) {
      return failure(null, new Error(`This team is full (max ${opp.max_team_size} members).`));
    }

    // Join
    const { error: joinErr } = await supabase.from("competition_team_members").insert({
      team_id: team.id,
      user_id: userId,
      role: "member",
    });
    if (joinErr) return failure(null, joinErr);

    return getCompetitionTeam(team.id);
  } catch (err) {
    return failure(null, err);
  }
}

export async function leaveCompetitionTeam(teamId: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Authentication required."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return failure(false, new Error("Not authenticated."));
    const userId = userRes.user.id;

    // Captain must transfer captaincy or disband before leaving
    const { data: team } = await supabase
      .from("competition_teams")
      .select("captain_user_id")
      .eq("id", teamId)
      .maybeSingle();
    if (team?.captain_user_id === userId) {
      return failure(false, new Error("You are the captain. Transfer captaincy or disband the team before leaving."));
    }

    const { error } = await supabase
      .from("competition_team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);
    if (error) return failure(false, error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function removeCompetitionTeamMember(
  teamId: string,
  targetUserId: string
): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Authentication required."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return failure(false, new Error("Not authenticated."));

    // Verify caller is captain
    const { data: team } = await supabase
      .from("competition_teams")
      .select("captain_user_id")
      .eq("id", teamId)
      .maybeSingle();
    if (!team || team.captain_user_id !== userRes.user.id) {
      return failure(false, new Error("Only the team captain can remove members."));
    }
    if (targetUserId === userRes.user.id) {
      return failure(false, new Error("Captain cannot remove themselves. Transfer captaincy first."));
    }

    const { error } = await supabase
      .from("competition_team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", targetUserId);
    if (error) return failure(false, error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function transferCompetitionTeamCaptain(
  teamId: string,
  newCaptainUserId: string
): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Authentication required."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return failure(false, new Error("Not authenticated."));

    const { data: team } = await supabase
      .from("competition_teams")
      .select("captain_user_id")
      .eq("id", teamId)
      .maybeSingle();
    if (!team || team.captain_user_id !== userRes.user.id) {
      return failure(false, new Error("Only the current captain can transfer captaincy."));
    }

    // Update team captain
    const { error: updateErr } = await supabase
      .from("competition_teams")
      .update({ captain_user_id: newCaptainUserId })
      .eq("id", teamId);
    if (updateErr) return failure(false, updateErr);

    // Update roles in members table
    await supabase
      .from("competition_team_members")
      .update({ role: "member" })
      .eq("team_id", teamId)
      .eq("user_id", userRes.user.id);
    await supabase
      .from("competition_team_members")
      .update({ role: "captain" })
      .eq("team_id", teamId)
      .eq("user_id", newCaptainUserId);

    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function closeCompetitionTeam(teamId: string): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(false, new Error("Authentication required."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return failure(false, new Error("Not authenticated."));

    const { data: team } = await supabase
      .from("competition_teams")
      .select("captain_user_id")
      .eq("id", teamId)
      .maybeSingle();
    if (!team || team.captain_user_id !== userRes.user.id) {
      return failure(false, new Error("Only the captain can disband the team."));
    }

    const { error } = await supabase
      .from("competition_teams")
      .update({ status: "disbanded" })
      .eq("id", teamId);
    if (error) return failure(false, error);
    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}

export async function getFeaturedOpportunities(): Promise<DataResult<OpportunityRecord[]>> {
  if (supabase) {
    try {
      const result = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "published")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!result.error && result.data) {
        return remoteSuccess(result.data.map(mapOpportunity));
      }
    } catch {
      // fallback
    }
  }
  const local = await LocalProvider.getOpportunities();
  return localSuccess(local.filter((o) => o.featured).slice(0, 20));
}

// ==========================================
// GENERAL APPLICATIONS
// ==========================================
export async function submitGeneralApplication(email: string, file: File): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
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
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const localSubmit = await LocalProvider.submitGeneralApplication(email, file);
  return localSuccess(localSubmit);
}

// ==========================================
// PROFILE ACCESS (student accounts)
// ==========================================
// These functions never accept a user_id from the caller. The owning
// user is always resolved from the live Supabase Auth session, matching
// the production RLS policy (user_id = auth.uid()) already configured
// on public.profiles.
export async function getCurrentUserProfile(): Promise<DataResult<ProfileRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Supabase authentication is not configured."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) {
      return failure(null, new Error("You must be signed in to view your profile."));
    }

    const result = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (result.error) return failure(null, result.error);
    if (!result.data) return remoteSuccess(null);
    return remoteSuccess(mapProfile(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function createProfile(input: ProfileInput): Promise<DataResult<ProfileRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Supabase authentication is not configured."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) {
      return failure(null, new Error("You must be signed in to create a profile."));
    }

    const payload = {
      user_id: user.id, // always the authenticated session's user id
      full_name: input.fullName.trim(),
      college_id: input.collegeId,
      course: input.course.trim(),
      year_of_study: input.yearOfStudy,
      graduation_year: input.graduationYear,
      gender: input.gender,
    };

    // upsert (rather than insert) makes this call idempotent: if the row
    // was already written on a previous attempt but the client lost the
    // response (network hiccup, crash, etc.), the retry merges cleanly
    // instead of hitting the UNIQUE constraint on user_id.
    const result = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapProfile(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

export async function updateProfile(input: ProfileInput): Promise<DataResult<ProfileRecord | null>> {
  if (!supabase || !isSupabaseConfigured) {
    return failure(null, new Error("Supabase authentication is not configured."));
  }
  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) {
      return failure(null, new Error("You must be signed in to update your profile."));
    }

    // user_id is intentionally omitted from the payload — it can never be changed.
    const payload = {
      full_name: input.fullName.trim(),
      college_id: input.collegeId,
      course: input.course.trim(),
      year_of_study: input.yearOfStudy,
      graduation_year: input.graduationYear,
      gender: input.gender,
    };

    const result = await supabase
      .from("profiles")
      .update(payload)
      .eq("user_id", user.id)
      .select()
      .single();

    if (result.error) return failure(null, result.error);
    return remoteSuccess(mapProfile(result.data));
  } catch (err) {
    return failure(null, err);
  }
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
export async function isCurrentUserAdmin(): Promise<DataResult<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return remoteSuccess(false);
  }

  try {
    // 1. Get the current authenticated user from Supabase Auth
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    const user = userResult?.user;
    if (userError || !user) {
      return remoteSuccess(false);
    }

    // 2. Validate against database security definer function is_admin()
    try {
      const { data: rpcIsAdmin, error: rpcError } = await supabase.rpc("is_admin");
      if (!rpcError && typeof rpcIsAdmin === "boolean") {
        if (!rpcIsAdmin) return remoteSuccess(false);
      }
    } catch {
      // Continue to direct admin_users query
    }

    // 3. Verify user exists in public.admin_users with active role = 'admin'
    const result = await supabase
      .from("admin_users")
      .select("id, user_id, role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (result.error || !result.data) {
      return remoteSuccess(false);
    }

    return remoteSuccess(true);
  } catch (err) {
    return failure(false, err);
  }
}
