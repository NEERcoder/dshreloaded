export type OpportunityCardData = {
  id: string;
  category: "Internship" | "Job" | "Competition" | "Certification";
  title: string;
  organization: string;
  location: string;
  deadline: string;
  accent: "red" | "blue";
};

export const opportunities: OpportunityCardData[] = [
  {
    id: "o1",
    category: "Internship",
    title: "Content & Research Intern",
    organization: "Student-led Education Platform",
    location: "Remote · Part-time",
    deadline: "Rolling",
    accent: "red",
  },
  {
    id: "o2",
    category: "Job",
    title: "Junior Science Communicator",
    organization: "EdTech Startup",
    location: "Delhi · Full-time",
    deadline: "Open",
    accent: "blue",
  },
  {
    id: "o3",
    category: "Competition",
    title: "National Science Quiz",
    organization: "University Science Forum",
    location: "National · Online",
    deadline: "Coming soon",
    accent: "red",
  },
  {
    id: "o4",
    category: "Certification",
    title: "Data Analysis for Beginners",
    organization: "Open Learning Platform",
    location: "Online · Self-paced",
    deadline: "Always open",
    accent: "blue",
  },
];
