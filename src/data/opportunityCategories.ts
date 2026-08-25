export type OpportunityCategory = {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: "red" | "blue";
  available: boolean;
};

export const opportunityCategories: OpportunityCategory[] = [
  {
    id: "internships",
    title: "Internships",
    description: "Hands-on roles to build real experience while you study.",
    icon: "briefcase",
    accent: "red",
    available: true,
  },
  {
    id: "jobs",
    title: "Jobs",
    description: "Full-time and part-time roles for science graduates.",
    icon: "target",
    accent: "blue",
    available: true,
  },
  {
    id: "competitions",
    title: "Competitions",
    description: "Hackathons, quizzes, case studies and academic contests.",
    icon: "trophy",
    accent: "red",
    available: true,
  },
  {
    id: "certifications",
    title: "Certifications",
    description: "Free and paid courses to strengthen your resume.",
    icon: "award",
    accent: "blue",
    available: false,
  },
  {
    id: "research",
    title: "Research Opportunities",
    description: "Projects, assistantships and research programs.",
    icon: "flask",
    accent: "blue",
    available: false,
  },
  {
    id: "scholarships",
    title: "Scholarships",
    description: "Financial support and academic awards to apply for.",
    icon: "gift",
    accent: "red",
    available: false,
  },
];
