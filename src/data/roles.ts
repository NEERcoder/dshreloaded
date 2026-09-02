export type RoleCardData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  fullDescription?: string;
  icon: string;
  accent: "red" | "blue";
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  workArrangement: string;
  workMode?: string;
  duration: string;
  status: "Open" | "Closed";
  isOpen: boolean;
  googleFormUrl: string;
};

/**
 * Central application URL mapping for DU Science Hub team positions.
 * Updates here automatically reflect across all role cards and detail views.
 */
export const roleApplicationUrls: Record<string, string> = {
  "campus-correspondent": "https://forms.gle/oqqLTmm45NEtvjV49",
  "canva-editor": "https://forms.gle/iFgQ2yeBB1Mcg9d66",
  "content-writer": "https://forms.gle/7w1LWVWb8nELKqo47",
  "founders-office-intern": "https://forms.gle/btLJ1qsocM74aMVH8",
};

export const roles: RoleCardData[] = [
  {
    id: "campus-correspondent",
    slug: "campus-correspondent",
    title: "Campus Correspondent",
    description: "Be the person who knows what's happening on campus. Cover campus stories, events and student takes.",
    fullDescription: "Be the person who knows what's happening on campus. Cover campus stories, societies, fests, and student takes across Delhi University.",
    icon: "mic",
    accent: "red",
    responsibilities: [
      "Represent your college across Delhi University",
      "Cover useful campus stories, society elections, and academic updates",
      "Share real student perspectives directly with the editorial team",
    ],
    requirements: [
      "Strong communication and interpersonal skills",
      "Enrolled in any Delhi University college",
      "Curiosity about campus culture and student needs",
    ],
    benefits: [
      "Hands-on journalism and media portfolio experience",
      "Network with student leaders and campus mentors across DU",
      "Official certificate of completion and recommendations",
    ],
    workArrangement: "Campus-based · Flexible hours",
    workMode: "Campus-based · Flexible",
    duration: "Semester attachment",
    status: "Open",
    isOpen: true,
    googleFormUrl: roleApplicationUrls["campus-correspondent"],
  },
  {
    id: "canva-editor",
    slug: "canva-editor",
    title: "Canva & Visual Designer",
    description: "Turn ideas into visuals people actually stop scrolling for. Create clean graphics, carousels and thumbnails.",
    fullDescription: "Turn ideas into visuals people actually stop scrolling for. Design clean, student-friendly graphics for college guides, social carousels, and video thumbnails.",
    icon: "palette",
    accent: "blue",
    responsibilities: [
      "Design clean, modern student-first graphics using Canva / Figma",
      "Create high-engagement Instagram carousels and story templates",
      "Collaborate with content writers to package complex DU info visually",
    ],
    requirements: [
      "Proficiency in Canva, Figma or Adobe Creative Cloud",
      "Strong eye for typography, color contrast, and layouts",
      "Portfolio or sample work showcasing social/editorial designs",
    ],
    benefits: [
      "Published creative portfolio viewed by thousands of DU students",
      "Creative freedom to shape visual identity of student campaigns",
      "Official certificate of completion and LinkedIn recommendation",
    ],
    workArrangement: "Remote · Flexible hours",
    workMode: "Remote · Flexible",
    duration: "Semester attachment",
    status: "Open",
    isOpen: true,
    googleFormUrl: roleApplicationUrls["canva-editor"],
  },
  {
    id: "content-writer",
    slug: "content-writer",
    title: "Content Writer",
    description: "Write stuff students actually want to read. Draft honest guides, college breakdowns, and advice.",
    fullDescription: "Write stuff students actually want to read. Draft honest college breakdowns, syllabus guides, exam advice, and unfiltered campus takes.",
    icon: "pen",
    accent: "red",
    responsibilities: [
      "Write concise, engaging college guides and course breakdowns",
      "Research DU admission policies, syllabus details, and society life",
      "Translate academic jargon into clear, student-native articles",
    ],
    requirements: [
      "Crisp, engaging writing voice (clean grammar, zero brochure fluff)",
      "Ability to research and verify official university information",
      "Enthusiasm for helping juniors navigate the DU journey",
    ],
    benefits: [
      "Byline credits on one of DU's fastest-growing student platforms",
      "Mentorship on editorial strategy, SEO, and content distribution",
      "Official certificate and verified LinkedIn recommendation",
    ],
    workArrangement: "Remote · Flexible hours",
    workMode: "Remote · Flexible",
    duration: "Semester attachment",
    status: "Open",
    isOpen: true,
    googleFormUrl: roleApplicationUrls["content-writer"],
  },
  {
    id: "founders-office-intern",
    slug: "founders-office-intern",
    title: "Founder's Office Intern",
    description: "Work close to the action. Collaborate with the core team on growth strategy, campus operations, and ops.",
    fullDescription: "Work close to the action. Collaborate directly with the founding team on platform growth strategy, college partnerships, and operations.",
    icon: "briefcase",
    accent: "blue",
    responsibilities: [
      "Support growth initiatives across North and South campus colleges",
      "Coordinate student outreach, community feedback, and partner relations",
      "Drive special student initiatives, contests, and creator programs",
    ],
    requirements: [
      "High initiative, organized execution, and problem-solving mindset",
      "Curiosity about student tech products, community building, and growth",
      "Comfort working across fast-moving team operations",
    ],
    benefits: [
      "Direct startup operations experience alongside founding members",
      "Cross-functional exposure across content, design, tech, and marketing",
      "High-impact letter of recommendation and priority career referrals",
    ],
    workArrangement: "Hybrid · Flexible hours",
    workMode: "Hybrid · Flexible",
    duration: "Semester attachment",
    status: "Open",
    isOpen: true,
    googleFormUrl: roleApplicationUrls["founders-office-intern"],
  },
];
