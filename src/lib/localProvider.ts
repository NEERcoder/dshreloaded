import { officialDuColleges, type CollegeRecord } from "../data/colleges";
export type { CollegeRecord };
import { mentors as seedMentors } from "../data/mentors";
import { videos as seedVideos } from "../data/videos";
import { roles as seedRoles } from "../data/roles";
import { opportunities as seedOpportunities } from "../data/opportunities";
import { reviews as seedReviews } from "../data/reviews";

export type ReviewRecord = {
  id: string;
  collegeId: string;
  collegeName?: string;
  collegeSlug?: string;
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
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type VideoRecord = {
  id: string;
  title: string;
  youtubeUrl: string | null;
  thumbnail: string | null;
  category: "college_review" | "campus_tour" | "student_interview" | "podcast" | "cuet_guidance" | "campus_story" | string;
  collegeId: string | null;
  college: string | null;
  description: string | null;
  duration: string | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

/** One round of a competition, in the order the admin arranged them. */
export type CompetitionRound = {
  id: string;
  title: string;
  details: string;
};

/**
 * How the original poster is framed into the 676:451 card.
 *
 * `x`/`y` are the centre of the crop as a fraction of the image, and `zoom` is
 * a multiplier on the largest 3:2 window that fits. Nothing here rewrites the
 * uploaded file: the original keeps its own aspect ratio and still renders in
 * full on the detail page.
 */
export type PosterCrop = {
  /** Pan offset as a fraction of the card frame, −1..2 tolerated, ±0.5 typical. */
  x: number;
  y: number;
  zoom: number;
  /**
   * The original poster's own width ÷ height, recorded when the crop is framed.
   * Without it a card cannot know which axis overflows the 676:451 box, so it
   * falls back to a plain cover crop instead of mis-positioning the poster.
   */
  ar?: number;
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
  // Phase 2: competition team formation (nullable/optional for backward compat)
  teamFormationEnabled: boolean;
  minTeamSize: number | null;
  maxTeamSize: number | null;
  createdAt: string;
  updatedAt: string;
  // FIELD 2.0 (migration 013). Optional so every existing construction of an
  // OpportunityRecord — the local development seeds included — keeps compiling
  // and keeps working with no deadline, prize or crop of its own.
  /** Precise UTC deadline. When present it supersedes the `deadline` date. */
  deadlineAt?: string | null;
  startAt?: string | null;
  /** Cash prize only. Null means unspecified, never zero. */
  prizeAmount?: number | null;
  /** Non-monetary rewards, free text: "Certificates + Goodies". */
  rewards?: string | null;
  rounds?: CompetitionRound[];
  posterCrop?: PosterCrop | null;
  organizerEmail?: string | null;
  organizerWhatsapp?: string | null;
  organizerWebsite?: string | null;
  /**
   * Migration 016. Optional so every existing construction — the local
   * development seeds included — keeps compiling, and a project that has not
   * applied the migration reads it back as "not set" rather than an error.
   */
  stream?: string | null;
};

export type OpportunityInput = Omit<OpportunityRecord, "id" | "createdAt" | "updatedAt">;

const STORAGE_KEYS = {
  reviews: "du_science_hub_reviews",
  opportunities: "du_science_hub_opportunities",
  mentors: "du_science_hub_mentors",
  videos: "du_science_hub_videos",
  teamMembers: "du_science_hub_team_members",
  teamRoles: "du_science_hub_team_roles",
  applications: "du_science_hub_applications",
} as const;

function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/storage errors in dev
  }
}

// Initial seed generators
function getInitialReviews(): ReviewRecord[] {
  return seedReviews.map((r, i) => {
    const college = officialDuColleges.find(
      (c) => c.name.toLowerCase().includes(r.college.toLowerCase()) || r.college.toLowerCase().includes(c.name.toLowerCase())
    );
    return {
      id: r.id || `seed_rev_${i + 1}`,
      collegeId: college ? college.id : "hindu-college",
      collegeName: r.college,
      name: r.initials ? `${r.initials} (Student)` : "JAVLIN Student",
      rating: r.rating || 5,
      review: r.review,
      status: "approved",
      createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    };
  });
}

function getInitialOpportunities(): OpportunityRecord[] {
  return seedOpportunities.map((op, i) => ({
    id: op.id || `seed_opp_${i + 1}`,
    title: op.title,
    organization: op.organization,
    category: (op.category.toLowerCase() as OpportunityRecord["category"]) || "internship",
    description: `[SAMPLE] ${op.title} at ${op.organization}. This is demonstration content for local development testing.`,
    eligibility: "Open to undergraduate students",
    field: "Science / Technology",
    eligibleCourses: ["BSc", "BTech", "BCom"],
    location: op.location || "Remote",
    mode: op.location?.includes("Remote") ? "Remote" : "On-site",
    stipend: "Performance-based / Unpaid (Sample)",
    duration: "2-3 Months",
    deadline: op.deadline || "Open",
    applicationUrl: "",
    imageUrl: null,
    status: "published",
    featured: i === 0,
    teamFormationEnabled: false,
    minTeamSize: null,
    maxTeamSize: null,
    // The competition row carries the fields FIELD 2.0 added, so the offline
    // demo shows a real team listing instead of a card that cannot exercise the
    // countdown, the prize line or the registration paths. Everything here is
    // demonstration data and is labelled as such.
    ...(op.category === "Competition"
      ? {
          teamFormationEnabled: true,
          minTeamSize: 2,
          maxTeamSize: 4,
          deadline: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
          deadlineAt: new Date(Date.now() + 6 * 86400000 - 2 * 3600000).toISOString(),
          prizeAmount: 25000,
          rewards: "Certificates + Medals",
          rounds: [
            { id: "r1", title: "Online Qualifier", details: "[SAMPLE] 60-minute objective test." },
            { id: "r2", title: "Semifinal", details: "[SAMPLE] Case round, top 20 teams." },
            { id: "r3", title: "Final", details: "[SAMPLE] Live presentation before the jury." },
          ],
          imageUrl: "/categories/field.png",
          posterCrop: { x: 0, y: 0, zoom: 1, ar: 1 },
          organizerEmail: "hello@javlin.space",
        }
      : {}),
    createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  }));
}

function getInitialMentors(): MentorRecord[] {
  return seedMentors.map((m, i) => ({
    id: m.id || `seed_men_${i + 1}`,
    name: m.name,
    photoUrl: null,
    college: m.college,
    course: m.course,
    year: m.year,
    bio: `Mentor specializing in ${m.expertise}. [SAMPLE]`,
    role: "Senior Mentor",
    expertise: m.expertise,
    profileUrl: null,
    contactUrl: null,
    active: true,
    sortOrder: i,
    createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  }));
}

function getInitialVideos(): VideoRecord[] {
  return seedVideos.map((v, i) => ({
    id: v.id || `seed_vid_${i + 1}`,
    title: v.title,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: null,
    category: v.category.toLowerCase().replace(/\s+/g, "_"),
    collegeId: null,
    college: null,
    description: `[SAMPLE] Student media preview for ${v.title}.`,
    duration: v.duration,
    featured: i === 0,
    active: true,
    sortOrder: i,
    publishedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  }));
}

function getInitialTeamRoles(): TeamRoleRecord[] {
  return seedRoles.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: r.description,
    fullDescription: r.fullDescription || r.description,
    responsibilities: r.responsibilities,
    requirements: r.requirements,
    benefits: r.benefits,
    workMode: r.workMode || r.workArrangement,
    duration: r.duration,
    googleFormUrl: r.googleFormUrl || "",
    isOpen: r.isOpen,
  }));
}

function getInitialTeamMembers(): TeamMemberRecord[] {
  return [
    {
      id: "tm1",
      name: "Student Lead",
      photoUrl: null,
      role: "Founder's Office",
      college: "Hans Raj College",
      course: "BSc Physics",
      shortBio: "Building JAVLIN for future students. [SAMPLE]",
      linkedinUrl: null,
    },
    {
      id: "tm2",
      name: "Editorial Contributor",
      photoUrl: null,
      role: "Content Writer",
      college: "Miranda House",
      course: "BSc Chemistry",
      shortBio: "Writing guides and college walkthroughs. [SAMPLE]",
      linkedinUrl: null,
    },
  ];
}

export const LocalProvider = {
  // Colleges
  async getColleges(): Promise<CollegeRecord[]> {
    return officialDuColleges;
  },

  async getCollegeBySlug(slug: string): Promise<CollegeRecord | null> {
    const found = officialDuColleges.find((c) => c.slug === slug || c.id === slug);
    if (found) return found;
    const normalized = slug.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return officialDuColleges.find((c) => c.slug.toLowerCase().replace(/[^a-z0-9]/g, "-") === normalized) || null;
  },

  // Reviews
  async getReviewsByCollege(collegeId: string): Promise<ReviewRecord[]> {
    const stored = safeGetStorage<ReviewRecord[]>(STORAGE_KEYS.reviews, getInitialReviews());
    return stored.filter((r) => (r.collegeId === collegeId || r.collegeName?.toLowerCase().includes(collegeId.toLowerCase())) && r.status === "approved");
  },

  async createAnonymousReview(input: { collegeId: string; name: string; rating: number; review: string }): Promise<ReviewRecord> {
    const stored = safeGetStorage<ReviewRecord[]>(STORAGE_KEYS.reviews, getInitialReviews());
    const college = officialDuColleges.find((c) => c.id === input.collegeId || c.slug === input.collegeId);
    const newRecord: ReviewRecord = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      collegeId: input.collegeId,
      collegeName: college ? college.name : input.collegeId,
      name: input.name.trim(),
      rating: input.rating,
      review: input.review.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    stored.unshift(newRecord);
    safeSetStorage(STORAGE_KEYS.reviews, stored);
    return newRecord;
  },

  async getAdminReviews(): Promise<ReviewRecord[]> {
    return safeGetStorage<ReviewRecord[]>(STORAGE_KEYS.reviews, getInitialReviews());
  },

  async moderateReview(id: string, status: "approved" | "rejected"): Promise<boolean> {
    const stored = safeGetStorage<ReviewRecord[]>(STORAGE_KEYS.reviews, getInitialReviews());
    const idx = stored.findIndex((r) => r.id === id);
    if (idx !== -1) {
      stored[idx].status = status;
      stored[idx].updatedAt = new Date().toISOString();
      safeSetStorage(STORAGE_KEYS.reviews, stored);
      return true;
    }
    return false;
  },

  async deleteReview(id: string): Promise<boolean> {
    const stored = safeGetStorage<ReviewRecord[]>(STORAGE_KEYS.reviews, getInitialReviews());
    const filtered = stored.filter((r) => r.id !== id);
    safeSetStorage(STORAGE_KEYS.reviews, filtered);
    return true;
  },

  // Mentors
  async getMentors(): Promise<MentorRecord[]> {
    const stored = safeGetStorage<MentorRecord[]>(STORAGE_KEYS.mentors, getInitialMentors());
    return stored
      .filter((m) => m.active !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getMentorsByCollege(collegeName: string): Promise<MentorRecord[]> {
    const stored = safeGetStorage<MentorRecord[]>(STORAGE_KEYS.mentors, getInitialMentors());
    return stored
      .filter((m) => m.active !== false && m.college && (m.college.toLowerCase().includes(collegeName.toLowerCase()) || collegeName.toLowerCase().includes(m.college.toLowerCase())))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getAdminMentors(): Promise<MentorRecord[]> {
    const stored = safeGetStorage<MentorRecord[]>(STORAGE_KEYS.mentors, getInitialMentors());
    return stored.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async saveMentor(input: Omit<MentorRecord, "id">, id?: string): Promise<MentorRecord> {
    const stored = safeGetStorage<MentorRecord[]>(STORAGE_KEYS.mentors, getInitialMentors());
    if (id) {
      const idx = stored.findIndex((m) => m.id === id);
      if (idx !== -1) {
        stored[idx] = {
          ...stored[idx],
          ...input,
          updatedAt: new Date().toISOString(),
        };
        safeSetStorage(STORAGE_KEYS.mentors, stored);
        return stored[idx];
      }
    }
    const newRecord: MentorRecord = {
      id: `men_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
      active: input.active !== undefined ? input.active : true,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stored.unshift(newRecord);
    safeSetStorage(STORAGE_KEYS.mentors, stored);
    return newRecord;
  },

  async deleteMentor(id: string): Promise<boolean> {
    const stored = safeGetStorage<MentorRecord[]>(STORAGE_KEYS.mentors, getInitialMentors());
    safeSetStorage(STORAGE_KEYS.mentors, stored.filter((m) => m.id !== id));
    return true;
  },

  // Videos
  async getVideos(): Promise<VideoRecord[]> {
    const stored = safeGetStorage<VideoRecord[]>(STORAGE_KEYS.videos, getInitialVideos());
    return stored
      .filter((v) => v.active !== false)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getVideosByCollege(collegeId: string): Promise<VideoRecord[]> {
    const stored = safeGetStorage<VideoRecord[]>(STORAGE_KEYS.videos, getInitialVideos());
    return stored
      .filter((v) => v.active !== false && v.collegeId === collegeId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async getAdminVideos(): Promise<VideoRecord[]> {
    const stored = safeGetStorage<VideoRecord[]>(STORAGE_KEYS.videos, getInitialVideos());
    return stored.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  async saveVideo(input: Omit<VideoRecord, "id">, id?: string): Promise<VideoRecord> {
    const stored = safeGetStorage<VideoRecord[]>(STORAGE_KEYS.videos, getInitialVideos());
    const college = officialDuColleges.find((c) => c.id === input.collegeId || c.slug === input.collegeId);
    if (id) {
      const idx = stored.findIndex((v) => v.id === id);
      if (idx !== -1) {
        stored[idx] = {
          ...stored[idx],
          ...input,
          college: college ? college.name : input.college,
          updatedAt: new Date().toISOString(),
        };
        safeSetStorage(STORAGE_KEYS.videos, stored);
        return stored[idx];
      }
    }
    const newRecord: VideoRecord = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
      college: college ? college.name : input.college,
      active: input.active !== undefined ? input.active : true,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stored.unshift(newRecord);
    safeSetStorage(STORAGE_KEYS.videos, stored);
    return newRecord;
  },

  async deleteVideo(id: string): Promise<boolean> {
    const stored = safeGetStorage<VideoRecord[]>(STORAGE_KEYS.videos, getInitialVideos());
    safeSetStorage(STORAGE_KEYS.videos, stored.filter((v) => v.id !== id));
    return true;
  },

  // Opportunities
  async getOpportunities(category?: OpportunityRecord["category"]): Promise<OpportunityRecord[]> {
    const stored = safeGetStorage<OpportunityRecord[]>(STORAGE_KEYS.opportunities, getInitialOpportunities());
    let list = stored.filter((op) => op.status === "published");
    if (category) {
      list = list.filter((op) => op.category === category);
    }
    return list;
  },

  async getOpportunityById(id: string): Promise<OpportunityRecord | null> {
    const stored = safeGetStorage<OpportunityRecord[]>(STORAGE_KEYS.opportunities, getInitialOpportunities());
    return stored.find((op) => op.id === id) || null;
  },

  async getAdminOpportunities(): Promise<OpportunityRecord[]> {
    return safeGetStorage<OpportunityRecord[]>(STORAGE_KEYS.opportunities, getInitialOpportunities());
  },

  async saveOpportunity(input: OpportunityInput, id?: string): Promise<OpportunityRecord> {
    const stored = safeGetStorage<OpportunityRecord[]>(STORAGE_KEYS.opportunities, getInitialOpportunities());
    if (id) {
      const idx = stored.findIndex((op) => op.id === id);
      if (idx !== -1) {
        stored[idx] = {
          ...stored[idx],
          ...input,
          updatedAt: new Date().toISOString(),
        };
        safeSetStorage(STORAGE_KEYS.opportunities, stored);
        return stored[idx];
      }
    }
    const newRecord: OpportunityRecord = {
      id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stored.unshift(newRecord);
    safeSetStorage(STORAGE_KEYS.opportunities, stored);
    return newRecord;
  },

  async deleteOpportunity(id: string): Promise<boolean> {
    const stored = safeGetStorage<OpportunityRecord[]>(STORAGE_KEYS.opportunities, getInitialOpportunities());
    safeSetStorage(STORAGE_KEYS.opportunities, stored.filter((op) => op.id !== id));
    return true;
  },

  // Team Roles
  async getOpenTeamRoles(): Promise<TeamRoleRecord[]> {
    const stored = safeGetStorage<TeamRoleRecord[]>(STORAGE_KEYS.teamRoles, getInitialTeamRoles());
    return stored.filter((r) => r.isOpen);
  },

  async getAdminTeamRoles(): Promise<TeamRoleRecord[]> {
    return safeGetStorage<TeamRoleRecord[]>(STORAGE_KEYS.teamRoles, getInitialTeamRoles());
  },

  async saveTeamRole(input: Omit<TeamRoleRecord, "id">, id?: string): Promise<TeamRoleRecord> {
    const stored = safeGetStorage<TeamRoleRecord[]>(STORAGE_KEYS.teamRoles, getInitialTeamRoles());
    if (id) {
      const idx = stored.findIndex((r) => r.id === id || r.slug === id);
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...input };
        safeSetStorage(STORAGE_KEYS.teamRoles, stored);
        return stored[idx];
      }
    }
    const newRecord: TeamRoleRecord = {
      id: input.slug || `role_${Date.now()}`,
      ...input,
    };
    stored.push(newRecord);
    safeSetStorage(STORAGE_KEYS.teamRoles, stored);
    return newRecord;
  },

  async deleteTeamRole(id: string): Promise<boolean> {
    const stored = safeGetStorage<TeamRoleRecord[]>(STORAGE_KEYS.teamRoles, getInitialTeamRoles());
    safeSetStorage(STORAGE_KEYS.teamRoles, stored.filter((r) => r.id !== id && r.slug !== id));
    return true;
  },

  // Team Members
  async getTeamMembers(): Promise<TeamMemberRecord[]> {
    return safeGetStorage<TeamMemberRecord[]>(STORAGE_KEYS.teamMembers, getInitialTeamMembers());
  },

  async getAdminTeamMembers(): Promise<TeamMemberRecord[]> {
    return safeGetStorage<TeamMemberRecord[]>(STORAGE_KEYS.teamMembers, getInitialTeamMembers());
  },

  async saveTeamMember(input: Omit<TeamMemberRecord, "id">, id?: string): Promise<TeamMemberRecord> {
    const stored = safeGetStorage<TeamMemberRecord[]>(STORAGE_KEYS.teamMembers, getInitialTeamMembers());
    if (id) {
      const idx = stored.findIndex((m) => m.id === id);
      if (idx !== -1) {
        stored[idx] = { ...stored[idx], ...input };
        safeSetStorage(STORAGE_KEYS.teamMembers, stored);
        return stored[idx];
      }
    }
    const newRecord: TeamMemberRecord = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...input,
    };
    stored.unshift(newRecord);
    safeSetStorage(STORAGE_KEYS.teamMembers, stored);
    return newRecord;
  },

  async deleteTeamMember(id: string): Promise<boolean> {
    const stored = safeGetStorage<TeamMemberRecord[]>(STORAGE_KEYS.teamMembers, getInitialTeamMembers());
    safeSetStorage(STORAGE_KEYS.teamMembers, stored.filter((m) => m.id !== id));
    return true;
  },

  // General Applications
  async submitGeneralApplication(email: string, file: File): Promise<boolean> {
    const applications = safeGetStorage<Array<{ id: string; email: string; fileName: string; status: string; createdAt: string }>>(
      STORAGE_KEYS.applications,
      []
    );
    applications.unshift({
      id: `app_${Date.now()}`,
      email: email.trim(),
      fileName: file.name,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    safeSetStorage(STORAGE_KEYS.applications, applications);
    return true;
  },
};
