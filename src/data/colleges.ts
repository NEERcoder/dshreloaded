export type CollegeRecord = {
  id: string;
  slug: string;
  name: string;
  campus: string;
  location: string;
  academicAreas: string[];
  type: string;
  courses: string[];
  about: string | null;
};

// College records are intentionally empty until the official DU dataset is connected.
export const colleges: CollegeRecord[] = [];
