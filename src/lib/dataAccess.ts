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
  error: error instanceof Error ? error.message : "Unable to complete this request.",
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
  profileUrl: row.profile_url ? String(row.profile_url) : null,
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
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
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
  if (supabase) {
    try {
      const result = await supabase.from("college_reviews").select("*, colleges(name)").order("created_at", { ascending: false });
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
  const localReviews = await LocalProvider.getAdminReviews();
  return localSuccess(localReviews);
}

export async function moderateReview(id: string, status: "approved" | "rejected"): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const result = await supabase.from("college_reviews").update({ status }).eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.moderateReview(id, status);
  return localSuccess(success);
}

export async function deleteReview(id: string): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const result = await supabase.from("college_reviews").delete().eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.deleteReview(id);
  return localSuccess(success);
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
  if (supabase) {
    try {
      const result = await supabase.from("mentors").select("*").order("sort_order").order("created_at");
      if (!result.error && result.data) {
        return remoteSuccess(result.data.map(mapMentor));
      }
    } catch {
      // fallback to local
    }
  }
  const localMentors = await LocalProvider.getAdminMentors();
  return localSuccess(localMentors);
}

export async function saveMentor(input: Omit<MentorRecord, "id">, id?: string): Promise<DataResult<MentorRecord | null>> {
  if (supabase) {
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
  const saved = await LocalProvider.saveMentor(input, id);
  return localSuccess(saved);
}

export async function deleteMentor(id: string): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const result = await supabase.from("mentors").delete().eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.deleteMentor(id);
  return localSuccess(success);
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
  if (supabase) {
    try {
      const result = await supabase
        .from("videos")
        .select("*, colleges(name)")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (!result.error && result.data) {
        return remoteSuccess(result.data.map(mapVideo));
      }
    } catch {
      // fallback to local
    }
  }
  const localVideos = await LocalProvider.getAdminVideos();
  return localSuccess(localVideos);
}

export async function saveVideo(input: Omit<VideoRecord, "id">, id?: string): Promise<DataResult<VideoRecord | null>> {
  if (supabase) {
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
  const saved = await LocalProvider.saveVideo(input, id);
  return localSuccess(saved);
}

export async function deleteVideo(id: string): Promise<DataResult<boolean>> {

  if (supabase) {
    try {
      const result = await supabase.from("videos").delete().eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.deleteVideo(id);
  return localSuccess(success);
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
  if (supabase) {
    try {
      const result = await supabase.from("team_members").select("*").order("sort_order").order("created_at");
      if (!result.error && result.data) {
        return remoteSuccess(result.data.map(mapTeamMember));
      }
    } catch {
      // fallback to local
    }
  }
  const localMembers = await LocalProvider.getAdminTeamMembers();
  return localSuccess(localMembers);
}

export async function saveTeamMember(input: Omit<TeamMemberRecord, "id">, id?: string): Promise<DataResult<TeamMemberRecord | null>> {
  if (supabase) {
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
  const saved = await LocalProvider.saveTeamMember(input, id);
  return localSuccess(saved);
}

export async function deleteTeamMember(id: string): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const result = await supabase.from("team_members").delete().eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.deleteTeamMember(id);
  return localSuccess(success);
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
  if (supabase) {
    try {
      const result = await supabase.from("team_roles").select("*").order("sort_order").order("created_at");
      if (!result.error && result.data) {
        return remoteSuccess(result.data.map(mapTeamRole));
      }
    } catch {
      // fallback to local
    }
  }
  const localRoles = await LocalProvider.getAdminTeamRoles();
  return localSuccess(localRoles);
}

export async function saveTeamRole(input: Omit<TeamRoleRecord, "id">, id?: string): Promise<DataResult<TeamRoleRecord | null>> {
  if (supabase) {
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
  const saved = await LocalProvider.saveTeamRole(input, id);
  return localSuccess(saved);
}

export async function deleteTeamRole(id: string): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const result = await supabase.from("team_roles").delete().eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.deleteTeamRole(id);
  return localSuccess(success);
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
  if (supabase) {
    try {
      const result = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
      if (!result.error && result.data) {
        return remoteSuccess(result.data.map(mapOpportunity));
      }
    } catch {
      // fallback to local
    }
  }
  const localOpps = await LocalProvider.getAdminOpportunities();
  return localSuccess(localOpps);
}

export async function saveOpportunity(input: OpportunityInput, id?: string): Promise<DataResult<OpportunityRecord | null>> {
  if (supabase) {
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
  const saved = await LocalProvider.saveOpportunity(input, id);
  return localSuccess(saved);
}

export async function deleteOpportunity(id: string): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const result = await supabase.from("opportunities").delete().eq("id", id);
      if (result.error) return failure(false, result.error);
      return remoteSuccess(true);
    } catch (err) {
      return failure(false, err);
    }
  }
  const success = await LocalProvider.deleteOpportunity(id);
  return localSuccess(success);
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
// ADMIN AUTHENTICATION
// ==========================================
export async function isCurrentUserAdmin(): Promise<DataResult<boolean>> {
  if (supabase) {
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) return failure(false, userError || new Error("No authenticated user."));
      const result = await supabase.from("admin_users").select("id").eq("user_id", userResult.user.id).maybeSingle();
      return result.error ? failure(false, result.error) : remoteSuccess(Boolean(result.data));
    } catch (err) {
      return failure(false, err);
    }
  }
  // In local development mode without Supabase, admin workspace is accessible for developer testing
  return localSuccess(true);
}
