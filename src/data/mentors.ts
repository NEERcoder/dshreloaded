export type MentorCardData = {
  id: string;
  initials: string;
  name: string;
  course: string;
  college: string;
  year: string;
  expertise: string;
};

export const mentors: MentorCardData[] = [
  {
    id: "m1",
    initials: "AK",
    name: "A. Khanna",
    course: "BSc Physics",
    college: "Hindu College",
    year: "3rd Year",
    expertise: "CUET prep & course selection",
  },
  {
    id: "m2",
    initials: "PS",
    name: "P. Sharma",
    course: "BSc Chemistry",
    college: "Miranda House",
    year: "Final Year",
    expertise: "Internships & research applications",
  },
  {
    id: "m3",
    initials: "RV",
    name: "R. Verma",
    course: "BSc Mathematics",
    college: "St. Stephen's College",
    year: "2nd Year",
    expertise: "Competitions & certifications",
  },
];
