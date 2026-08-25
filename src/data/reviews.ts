export type ReviewCardData = {
  id: string;
  initials: string;
  college: string;
  course: string;
  rating: number;
  review: string;
};

export const reviews: ReviewCardData[] = [
  {
    id: "r1",
    initials: "A.",
    college: "Hindu College",
    course: "BSc Physics",
    rating: 5,
    review:
      "The campus is lively and the faculty is genuinely helpful. The science societies keep you engaged throughout the year.",
  },
  {
    id: "r2",
    initials: "S.",
    college: "Miranda House",
    course: "BSc Chemistry",
    rating: 4,
    review:
      "Great academics and a strong sense of community. Labs are well-equipped and seniors are very supportive.",
  },
  {
    id: "r3",
    initials: "R.",
    college: "St. Stephen's College",
    course: "BSc Mathematics",
    rating: 5,
    review:
      "Rigorous coursework and brilliant peer group. The interview-based admission was intense but worth it.",
  },
];
