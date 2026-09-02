import type { PlatformPanelData } from "../components/PlatformPanel";

export const platformPanels: PlatformPanelData[] = [
  {
    id: "explore-du",
    panelNumber: 1,
    title: "Find your DU era.",
    subtitle: "A complete guide to Delhi University, by seniors.",
    description:
      "Discover colleges, hear unfiltered student takes, watch real campus experiences and get guidance from seniors who've already been through the grind.",
    items: [
      { label: "College Guides", icon: "building" },
      { label: "DU Unfiltered Media", icon: "play" },
      { label: "Real Student Reviews", icon: "star" },
      { label: "Seniors & Mentors", icon: "users" },
    ],
    cta: "Explore Colleges",
    ctaHref: "/explore",
    accent: "blue",
    personality: "editorial",
  },
  {
    id: "join-team",
    panelNumber: 2,
    title: "Build DU with us.",
    subtitle: "Work on something students actually use.",
    description:
      "We're creating the internet home for Delhi University science students — and we're looking for ambitious peers to run campus stories, design, and operations.",
    items: [
      { label: "Campus Correspondent", icon: "mic" },
      { label: "Canva & Brand Editor", icon: "palette" },
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
    title: "Your next move starts here.",
    subtitle: "Internships, competitions & research for science students.",
    description:
      "Lowkey useful, highkey important. Verified opportunities to build experience, publish research, test your skills, and earn credentials.",
    items: [
      { label: "Internships & Jobs", icon: "briefcase" },
      { label: "Hackathons & Competitions", icon: "trophy" },
      { label: "Research Opportunities", icon: "flask" },
      { label: "Skill Certifications", icon: "award" },
    ],
    cta: "Open Opportunity Radar",
    ctaHref: "/opportunities",
    accent: "blue",
    personality: "discovery",
  },
];
