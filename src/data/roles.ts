export type RoleCardData = {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: "red" | "blue";
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  workArrangement: string;
  duration: string;
  status: "Open" | "Closed";
  googleFormUrl: string;
};

export const roles: RoleCardData[] = [
  {
    id: "campus-correspondent",
    title: "Campus Correspondent",
    description: "Represent your college, cover campus stories and bring DU voices to the platform.",
    icon: "mic",
    accent: "red",
    responsibilities: ["Represent your college", "Cover useful campus stories", "Share student perspectives with the editorial team"],
    requirements: ["Strong communication", "Curiosity about campus life", "Reliable access to a phone or camera"],
    benefits: ["Portfolio experience", "Networking", "Certificate where applicable"],
    workArrangement: "Part-time · Flexible",
    duration: "As shared in the application",
    status: "Open",
    googleFormUrl: "",
  },
  {
    id: "canva-editor",
    title: "Canva Editor",
    description: "Design clean, student-friendly visuals for guides, social posts and video thumbnails.",
    icon: "palette",
    accent: "blue",
    responsibilities: ["Create student-friendly graphics", "Design social posts and guide visuals", "Collaborate on video thumbnails"],
    requirements: ["Comfort with Canva", "A good eye for clear layouts", "Ability to take feedback"],
    benefits: ["Portfolio experience", "Practical design exposure", "Certificate where applicable"],
    workArrangement: "Remote · Part-time",
    duration: "As shared in the application",
    status: "Open",
    googleFormUrl: "",
  },
  {
    id: "content-writer",
    title: "Content Writer",
    description: "Write honest, useful guides and stories that help juniors navigate the DU journey.",
    icon: "pen",
    accent: "blue",
    responsibilities: ["Write useful college guides", "Edit stories for clarity and accuracy", "Turn student questions into helpful content"],
    requirements: ["Clear written communication", "Research mindset", "Attention to detail"],
    benefits: ["Published portfolio work", "Editorial mentorship", "Certificate where applicable"],
    workArrangement: "Remote · Part-time",
    duration: "As shared in the application",
    status: "Open",
    googleFormUrl: "",
  },
  {
    id: "founders-office-intern",
    title: "Founder's Office Intern",
    description: "Work closely with the core team on strategy, operations and building the platform.",
    icon: "briefcase",
    accent: "red",
    responsibilities: ["Support strategy and operations", "Coordinate cross-functional projects", "Help improve the student platform"],
    requirements: ["Ownership and organization", "Comfort working across tasks", "Interest in student products"],
    benefits: ["Real-world experience", "Networking", "Letter of recommendation for eligible performers"],
    workArrangement: "Remote · Part-time",
    duration: "As shared in the application",
    status: "Open",
    googleFormUrl: "",
  },
];
