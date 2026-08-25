export type RoleCardData = {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: "red" | "blue";
};

export const roles: RoleCardData[] = [
  {
    id: "campus-correspondent",
    title: "Campus Correspondent",
    description: "Represent your college, cover campus stories and bring DU voices to the platform.",
    icon: "mic",
    accent: "red",
  },
  {
    id: "canva-editor",
    title: "Canva Editor",
    description: "Design clean, student-friendly visuals for guides, social posts and video thumbnails.",
    icon: "palette",
    accent: "blue",
  },
  {
    id: "content-writer",
    title: "Content Writer",
    description: "Write honest, useful guides and stories that help juniors navigate the DU journey.",
    icon: "pen",
    accent: "blue",
  },
  {
    id: "founders-office-intern",
    title: "Founder's Office Intern",
    description: "Work closely with the core team on strategy, operations and building the platform.",
    icon: "briefcase",
    accent: "red",
  },
];
