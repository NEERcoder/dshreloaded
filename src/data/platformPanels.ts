import type { PlatformPanelData } from "../components/PlatformPanel";

export const platformPanels: PlatformPanelData[] = [
  {
    id: "explore-du",
    panelNumber: 1,
    title: "Explore DU",
    subtitle: "A Complete DU Guide, By the Seniors.",
    description:
      "Discover colleges, hear from students, watch real campus experiences and find guidance from people who have already been through the DU journey.",
    items: [
      { label: "College Guides", icon: "building" },
      { label: "Videos & Podcasts", icon: "play" },
      { label: "Student Reviews", icon: "star" },
      { label: "Seniors & Mentors", icon: "users" },
    ],
    cta: "Explore DU",
    ctaHref: "/explore",
    accent: "blue",
    personality: "editorial",
  },
  {
    id: "join-team",
    panelNumber: 2,
    title: "Join DU Science Hub",
    subtitle: "Build Something Students Actually Use.",
    description:
      "We're building a student-powered platform for DU — and we're looking for ambitious students to help us build it.",
    items: [
      { label: "Campus Correspondent", icon: "mic" },
      { label: "Canva Editor", icon: "palette" },
      { label: "Content Writer", icon: "pen" },
      { label: "Founder's Office Intern", icon: "briefcase" },
    ],
    cta: "Join Our Team",
    ctaHref: "/join",
    accent: "red",
    personality: "community",
  },
  {
    id: "find-opportunities",
    panelNumber: 3,
    title: "Find Opportunities",
    subtitle: "Internships, Jobs & Competitions for BSc & Science Students.",
    description:
      "Discover opportunities that can help you build experience, develop skills and move forward academically and professionally.",
    items: [
      { label: "Internships", icon: "briefcase" },
      { label: "Jobs", icon: "target" },
      { label: "Competitions", icon: "trophy" },
      { label: "Certifications", icon: "award" },
      { label: "Research Opportunities", icon: "flask" },
      { label: "Scholarships", icon: "gift" },
    ],
    cta: "Explore Opportunities",
    ctaHref: "/opportunities",
    accent: "blue",
    personality: "discovery",
  },
];
