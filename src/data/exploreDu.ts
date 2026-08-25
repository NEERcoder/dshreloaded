export type ProductCardData = {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: "red" | "blue";
};

export const exploreDuCards: ProductCardData[] = [
  {
    id: "college-guides",
    title: "College Guides",
    description: "Detailed, senior-written guides to every DU college — courses, campus, vibe and what to expect.",
    icon: "building",
    accent: "blue",
  },
  {
    id: "videos-podcasts",
    title: "Videos & Podcasts",
    description: "Watch real campus experiences, student interviews and honest conversations about life at DU.",
    icon: "play",
    accent: "red",
  },
  {
    id: "student-reviews",
    title: "Student Reviews",
    description: "Authentic, unfiltered reviews from students already studying in DU colleges and courses.",
    icon: "star",
    accent: "blue",
  },
  {
    id: "seniors-mentors",
    title: "Seniors & Mentors",
    description: "Connect with seniors who've been through it — get guidance on admissions, courses and careers.",
    icon: "users",
    accent: "red",
  },
];
