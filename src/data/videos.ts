export type VideoCategory = {
  id: string;
  label: string;
};

export const videoCategories: VideoCategory[] = [
  { id: "college-reviews", label: "College Reviews" },
  { id: "student-interviews", label: "Student Interviews" },
  { id: "podcasts", label: "Podcasts" },
  { id: "cuet-guidance", label: "CUET Guidance" },
  { id: "campus-stories", label: "Campus Stories" },
];

export type VideoCardData = {
  id: string;
  category: string;
  title: string;
  duration: string;
  accent: "red" | "blue";
};

export const videos: VideoCardData[] = [
  {
    id: "v1",
    category: "College Reviews",
    title: "A full walkthrough of a North Campus college — courses, campus and crowd",
    duration: "12:40",
    accent: "blue",
  },
  {
    id: "v2",
    category: "Student Interviews",
    title: "A BSc student shares their first-year experience and what they wish they knew",
    duration: "08:15",
    accent: "red",
  },
  {
    id: "v3",
    category: "Podcasts",
    title: "Conversations about choosing the right science course at DU",
    duration: "21:30",
    accent: "blue",
  },
  {
    id: "v4",
    category: "CUET Guidance",
    title: "How to prepare for CUET — a senior's honest strategy and tips",
    duration: "15:05",
    accent: "red",
  },
];
