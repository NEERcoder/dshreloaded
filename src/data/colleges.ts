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
  heroImageUrl: string | null;
  createdAt: string;
};

// Official 91 Delhi University institutions baseline
// Sources:
// - Primary College Directory: https://www.du.ac.in/index.php?page=colleges-at-du and https://beta.du.ac.in/collegedu/
// - Programme Information: Official University of Delhi 2026-27 Undergraduate Bulletin of Information
// - Institutional classifications verified against official University of Delhi sources.
export const officialDuColleges: CollegeRecord[] = [
  {
    "id": "acharya-narendra-dev-college",
    "slug": "acharya-narendra-dev-college",
    "name": "Acharya Narendra Dev College",
    "campus": "South Campus",
    "location": "Govindpuri, Kalkaji, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Biomedical Science",
      "BSc (Hons) Computer Science",
      "BSc (Hons) Electronics",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BCom (Hons)"
    ],
    "about": "A constituent college of the University of Delhi located in Govindpuri, specializing in undergraduate science and commerce education with dedicated research laboratories.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "aditi-mahavidyalaya",
    "slug": "aditi-mahavidyalaya",
    "name": "Aditi Mahavidyalaya",
    "campus": "Off Campus",
    "location": "Bawana, Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Education",
      "Vocational"
    ],
    "type": "Women's",
    "courses": [
      "Bachelor of Elementary Education (B.El.Ed)",
      "BA (Hons) Geography",
      "BA (Hons) Social Work",
      "BCom (Hons)",
      "B.Voc (Health Care Management)"
    ],
    "about": "A women's constituent college of Delhi University situated in Bawana, offering programmes in humanities, commerce, vocational studies, and elementary education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "ahilya-bai-college-of-nursing",
    "slug": "ahilya-bai-college-of-nursing",
    "name": "Ahilya Bai College of Nursing",
    "campus": "Other / Specialized",
    "location": "Lok Nayak Hospital, Delhi Gate, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Nursing"
    ],
    "about": "An institution affiliated with the University of Delhi located within Lok Nayak Hospital, providing professional degree programmes in nursing and health sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "all-india-institute-of-ayurveda",
    "slug": "all-india-institute-of-ayurveda",
    "name": "All India Institute of Ayurveda",
    "campus": "Other / Specialized",
    "location": "Gautampuri, Sarita Vihar, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "MD (Ayurveda)",
      "MS (Ayurveda)",
      "PhD (Ayurveda)"
    ],
    "about": "An autonomous apex institute for Ayurveda under the Ministry of Ayush, affiliated with Delhi University for postgraduate and doctoral studies in Ayurvedic medicine.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "amar-jyoti-institute-of-physiotherapy",
    "slug": "amar-jyoti-institute-of-physiotherapy",
    "name": "Amar Jyoti Institute of Physiotherapy",
    "campus": "Other / Specialized",
    "location": "Karkardooma, Vikas Marg, Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Physiotherapy (BPT)",
      "Master of Physiotherapy (MPT)"
    ],
    "about": "A specialized institution affiliated with the University of Delhi dedicated to physiotherapy education, rehabilitation sciences, and clinical training.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "aryabhatta-college",
    "slug": "aryabhatta-college",
    "name": "Aryabhatta College",
    "campus": "South Campus",
    "location": "Benito Juarez Marg, Anand Niketan, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Management",
      "Science"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Mathematics",
      "Bachelor of Management Studies (BMS)",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Psychology"
    ],
    "about": "A co-educational constituent college on South Campus offering undergraduate programmes across arts, commerce, management studies, mathematics, and computer science.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "atma-ram-sanatan-dharma-college",
    "slug": "atma-ram-sanatan-dharma-college",
    "name": "Atma Ram Sanatan Dharma College",
    "campus": "South Campus",
    "location": "Dhaula Kuan, Benito Juarez Marg, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Electronics",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A premier South Campus constituent college of Delhi University known for its comprehensive undergraduate offerings in sciences, humanities, and commerce.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "ayurvedic-and-unani-tibia-college",
    "slug": "ayurvedic-and-unani-tibia-college",
    "name": "Ayurvedic & Unani Tibia College",
    "campus": "Other / Specialized",
    "location": "Karol Bagh, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Ayurvedic Medicine and Surgery (BAMS)",
      "Bachelor of Unani Medicine and Surgery (BUMS)"
    ],
    "about": "A historic government institution affiliated with Delhi University offering classical degree courses in Ayurvedic and Unani systems of medicine and surgery.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "bhagini-nivedita-college",
    "slug": "bhagini-nivedita-college",
    "name": "Bhagini Nivedita College",
    "campus": "Off Campus",
    "location": "Kair, Najafgarh, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Science"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Home Science",
      "BSc (Hons) Physics",
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Prog)"
    ],
    "about": "A constituent women's college of the University of Delhi situated in South-West Delhi, offering foundational undergraduate courses in sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "bharati-college",
    "slug": "bharati-college",
    "name": "Bharati College",
    "campus": "Off Campus",
    "location": "Janakpuri, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Science"
    ],
    "type": "Women's",
    "courses": [
      "BA (Hons) Journalism",
      "BA (Hons) Psychology",
      "BCom (Hons)",
      "BSc (Hons) Mathematics",
      "BA (Hons) English"
    ],
    "about": "A women's college of Delhi University located in Janakpuri, offering undergraduate programmes in humanities, commerce, journalism, and mathematical sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "bhaskaracharya-college-of-applied-sciences",
    "slug": "bhaskaracharya-college-of-applied-sciences",
    "name": "Bhaskaracharya College of Applied Sciences",
    "campus": "Off Campus",
    "location": "Sector 2, Phase 1, Dwarka, New Delhi",
    "academicAreas": [
      "Science"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Food Technology",
      "BSc (Hons) Biomedical Science",
      "BSc (Hons) Computer Science",
      "BSc (Hons) Instrumentation",
      "BSc (Hons) Polymer Science",
      "BSc (Hons) Electronics"
    ],
    "about": "A specialized constituent college of DU in Dwarka dedicated exclusively to undergraduate education and research in applied and technological sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "bhim-rao-ambedkar-college",
    "slug": "bhim-rao-ambedkar-college",
    "name": "Bhim Rao Ambedkar College",
    "campus": "Off Campus",
    "location": "Yamuna Vihar, Delhi",
    "academicAreas": [
      "Commerce",
      "Social Sciences",
      "Arts & Humanities",
      "Management"
    ],
    "type": "Co-educational",
    "courses": [
      "BA (Hons) Business Economics (BBE)",
      "BA (Hons) Social Work",
      "BA (Hons) Journalism",
      "BCom (Hons)",
      "BA (Hons) Geography"
    ],
    "about": "A co-educational constituent college in East Delhi offering undergraduate degrees in commerce, business economics, social work, journalism, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "chacha-nehru-bal-chikitsalaya",
    "slug": "chacha-nehru-bal-chikitsalaya",
    "name": "Chacha Nehru Bal Chikitsalaya",
    "campus": "Other / Specialized",
    "location": "Geeta Colony, Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Postgraduate Medical Training",
      "Pediatric Specializations"
    ],
    "about": "An autonomous pediatric super-specialty hospital and medical education centre affiliated with the University of Delhi for advanced post-graduate medical training.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "college-of-art",
    "slug": "college-of-art",
    "name": "College of Art",
    "campus": "Other / Specialized",
    "location": "Tilak Marg, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Fine Arts (BFA) Applied Art",
      "BFA Painting",
      "BFA Sculpture",
      "BFA Visual Communication",
      "BFA Printmaking"
    ],
    "about": "An institution affiliated with the University of Delhi for professional training in creative visual arts, offering specialized undergraduate Bachelor of Fine Arts degrees.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "college-of-nursing-at-army-hospital-r-r",
    "slug": "college-of-nursing-at-army-hospital-r-r",
    "name": "College of Nursing at Army Hospital (R&R)",
    "campus": "Other / Specialized",
    "location": "Army Hospital (R&R), Dhaula Kuan, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Nursing"
    ],
    "about": "A premier military nursing education institute affiliated with Delhi University, training women cadets for professional nursing and military health services.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "college-of-vocational-studies",
    "slug": "college-of-vocational-studies",
    "name": "College of Vocational Studies",
    "campus": "South Campus",
    "location": "Triveni, Sheikh Sarai Phase II, New Delhi",
    "academicAreas": [
      "Vocational",
      "Management",
      "Commerce",
      "Arts & Humanities",
      "Science"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Management Studies (BMS)",
      "BSc (Hons) Computer Science",
      "B.Voc (Tourism Management)",
      "B.Voc (Retail Management)",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A pioneer institution in vocational higher education on South Campus offering specialized vocational courses, management studies, computer science, and liberal arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "daulat-ram-college",
    "slug": "daulat-ram-college",
    "name": "Daulat Ram College",
    "campus": "North Campus",
    "location": "4 Patel Marg, Maurice Nagar, University Enclave, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Biochemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BSc (Hons) Chemistry",
      "BCom (Hons)",
      "BA (Hons) Psychology",
      "BA (Hons) Economics"
    ],
    "about": "A prominent North Campus constituent women's college of Delhi University providing comprehensive education in sciences, commerce, social sciences, and languages.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "deen-dayal-upadhyaya-college",
    "slug": "deen-dayal-upadhyaya-college",
    "name": "Deen Dayal Upadhyaya College",
    "campus": "Off Campus",
    "location": "Sector 3, Dwarka, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Management",
      "Arts & Humanities"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Electronics",
      "BSc (Hons) Physics",
      "Bachelor of Management Studies (BMS)",
      "BCom (Hons)",
      "BSc (Hons) Mathematics"
    ],
    "about": "A modern co-educational constituent college in Dwarka recognized for undergraduate science, computer science, management studies, and commerce education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "delhi-college-of-arts-and-commerce",
    "slug": "delhi-college-of-arts-and-commerce",
    "name": "Delhi College of Arts & Commerce",
    "campus": "South Campus",
    "location": "Netaji Nagar, New Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BA (Hons) Journalism",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) English",
      "BA (Hons) History",
      "BCom (Prog)"
    ],
    "about": "A constituent college on South Campus known for introducing pioneering undergraduate programmes in journalism, commerce, and applied social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "delhi-institute-of-pharmaceutical-sciences-and-research",
    "slug": "delhi-institute-of-pharmaceutical-sciences-and-research",
    "name": "Delhi Institute of Pharmaceutical Sciences and Research",
    "campus": "Other / Specialized",
    "location": "Pushp Vihar, Sector 3, M.B. Road, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Science",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Pharmacy (B.Pharm)",
      "Diploma in Pharmacy (D.Pharm)",
      "Master of Pharmacy (M.Pharm)"
    ],
    "about": "An advanced premier institute associated with pharmaceutical education and research in India, offering degree courses in pharmacy and pharmaceutical sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "deshbandhu-college-morning",
    "slug": "deshbandhu-college-morning",
    "name": "Deshbandhu College(Morning)",
    "campus": "South Campus",
    "location": "Kalkaji, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Biochemistry",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Political Science"
    ],
    "about": "The oldest constituent college in South Delhi, offering an extensive range of undergraduate programmes in basic sciences, life sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "durga-bai-deshmukh-college-of-special-edu-vi",
    "slug": "durga-bai-deshmukh-college-of-special-edu-vi",
    "name": "Durga Bai Deshmukh College of Special Edu.(VI)",
    "campus": "Other / Specialized",
    "location": "Lal Bahadur Shastri Marg, New Delhi",
    "academicAreas": [
      "Education",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "B.Ed Special Education (Visual Impairment)"
    ],
    "about": "A specialized teacher education college established by the Blind Relief Association, affiliated with DU to prepare educators in visual impairment special education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "dyal-singh-college",
    "slug": "dyal-singh-college",
    "name": "Dyal Singh College",
    "campus": "South Campus",
    "location": "Lodhi Road, Pragati Vihar, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A prominent South Campus constituent co-educational college on Lodhi Road with large science, commerce, and humanities departments.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "dyal-singh-college-evening",
    "slug": "dyal-singh-college-evening",
    "name": "Dyal Singh College (Evening)",
    "campus": "South Campus",
    "location": "Lodhi Road, Pragati Vihar, New Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) Political Science",
      "BA (Hons) History",
      "BA (Prog)"
    ],
    "about": "A constituent evening college of Delhi University offering undergraduate degree programmes in commerce, social sciences, and humanities for working students and aspirants.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "florence-nightingale-college-of-nursing",
    "slug": "florence-nightingale-college-of-nursing",
    "name": "Florence Nightingale College of Nursing",
    "campus": "Other / Specialized",
    "location": "GTB Hospital Complex, Dilshad Garden, Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Nursing"
    ],
    "about": "A government nursing college attached to Guru Teg Bahadur Hospital, affiliated with DU for professional collegiate nursing education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "g-b-pant-hospital",
    "slug": "g-b-pant-hospital",
    "name": "G.B. Pant Hospital",
    "campus": "Other / Specialized",
    "location": "1 Jawaharlal Nehru Marg, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "DM (Cardiology / Neurology / Gastroenterology)",
      "MCh (Surgical Specialities)"
    ],
    "about": "Govind Ballabh Pant Institute of Postgraduate Medical Education and Research (GIPMER), affiliated with DU for super-specialty medical training and doctoral studies.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "gargi-college",
    "slug": "gargi-college",
    "name": "Gargi College",
    "campus": "South Campus",
    "location": "Siri Fort Road, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences",
      "Education"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Microbiology",
      "BSc (Hons) Botany",
      "BSc (Hons) Chemistry",
      "BCom (Hons)",
      "Bachelor of Elementary Education (B.El.Ed)",
      "BA (Hons) Psychology"
    ],
    "about": "A leading South Campus constituent women's college known for excellence in undergraduate sciences, commerce, humanities, and elementary education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "hans-raj-college",
    "slug": "hans-raj-college",
    "name": "Hans Raj College",
    "campus": "North Campus",
    "location": "Mahatma Hans Raj Marg, Malkaganj, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Computer Science",
      "BSc (Hons) Zoology",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "One of Delhi University's largest and most prominent North Campus constituent institutions, with distinguished traditions in physical, natural, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "hindu-college",
    "slug": "hindu-college",
    "name": "Hindu College",
    "campus": "North Campus",
    "location": "University Enclave, North Campus, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BSc (Hons) Statistics",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Political Science"
    ],
    "about": "A foundational constituent college of the University of Delhi on North Campus, renowned for undergraduate academic excellence across sciences, humanities, and commerce.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "holy-family-college-of-nursing",
    "slug": "holy-family-college-of-nursing",
    "name": "Holy Family College of Nursing",
    "campus": "Other / Specialized",
    "location": "Okhla Road, Jamia Nagar, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Nursing",
      "MSc Nursing"
    ],
    "about": "A specialized healthcare education college affiliated with Delhi University providing professional degree education in nursing and clinical care.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "indira-gandhi-institute-of-physical-education-and-sports-sciences",
    "slug": "indira-gandhi-institute-of-physical-education-and-sports-sciences",
    "name": "Indira Gandhi Institute of Physical Education & Sports Sciences",
    "campus": "Other / Specialized",
    "location": "Block B, Vikaspuri, New Delhi",
    "academicAreas": [
      "Education",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Physical Education, Health Education & Sports)",
      "Bachelor of Physical Education (B.P.Ed)",
      "M.P.Ed"
    ],
    "about": "A specialized constituent institution of DU in Vikaspuri offering professional degree programmes in physical education, health education, and sports sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "indraprastha-college-for-women",
    "slug": "indraprastha-college-for-women",
    "name": "Indraprastha College for Women",
    "campus": "North Campus",
    "location": "31 Sham Nath Marg, Civil Lines, Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Social Sciences",
      "Science",
      "Commerce"
    ],
    "type": "Women's",
    "courses": [
      "BA (Hons) Multi Media and Mass Communication (MMMC)",
      "BSc (Hons) Computer Science",
      "BA (Hons) Psychology",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BSc (Hons) Mathematics"
    ],
    "about": "The oldest women's college of Delhi University, offering undergraduate courses in liberal arts, mass communication, commerce, and computer science.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "institute-of-home-economics",
    "slug": "institute-of-home-economics",
    "name": "Institute of Home Economics",
    "campus": "South Campus",
    "location": "F-4, Hauz Khas Enclave, New Delhi",
    "academicAreas": [
      "Science",
      "Education",
      "Social Sciences"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Food Technology",
      "BSc (Hons) Home Science",
      "BSc (Hons) Biochemistry",
      "BSc (Hons) Microbiology",
      "Bachelor of Elementary Education (B.El.Ed)"
    ],
    "about": "A constituent women's college of DU on South Campus focused on home science, food technology, biochemistry, microbiology, and teacher education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "institute-of-human-behaviour-and-allied-sciences",
    "slug": "institute-of-human-behaviour-and-allied-sciences",
    "name": "Institute of Human Behaviour & Allied Sciences",
    "campus": "Other / Specialized",
    "location": "Taharpur Road, Dilshad Garden, Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "MD (Psychiatry)",
      "DM (Neurology)",
      "MPhil (Clinical Psychology)"
    ],
    "about": "An autonomous medical institution affiliated with the University of Delhi dedicated to postgraduate education and research in psychiatry, neurology, and neurosciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "janki-devi-memorial-college",
    "slug": "janki-devi-memorial-college",
    "name": "Janki Devi Memorial College",
    "campus": "Off Campus",
    "location": "Sir Ganga Ram Hospital Marg, Old Rajinder Nagar, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Science"
    ],
    "type": "Women's",
    "courses": [
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Philosophy",
      "BSc (Hons) Mathematics",
      "BA (Hons) History"
    ],
    "about": "A constituent women's college of DU located in Central Delhi, offering undergraduate degrees across humanities, commerce, and mathematics.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "jesus-and-mary-college",
    "slug": "jesus-and-mary-college",
    "name": "Jesus & Mary College",
    "campus": "South Campus",
    "location": "Bapu Dham, Chanakyapuri, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Management",
      "Vocational",
      "Education"
    ],
    "type": "Women's",
    "courses": [
      "BCom (Hons)",
      "BA (Hons) Psychology",
      "BA (Hons) Economics",
      "B.Voc (Healthcare Management)",
      "B.Voc (Retail Management)",
      "Bachelor of Elementary Education (B.El.Ed)"
    ],
    "about": "A constituent women's college on South Campus in Chanakyapuri offering degree programmes in arts, commerce, vocational studies, and elementary education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "kalindi-college-for-women",
    "slug": "kalindi-college-for-women",
    "name": "Kalindi College for Women",
    "campus": "Off Campus",
    "location": "East Patel Nagar, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences",
      "Vocational"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Physics",
      "BA (Hons) Journalism",
      "BCom (Hons)",
      "B.Voc (Web Designing)"
    ],
    "about": "A constituent women's college in Patel Nagar offering undergraduate degree programmes in physical and biological sciences, journalism, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "kamla-nehru-college-for-women",
    "slug": "kamla-nehru-college-for-women",
    "name": "Kamla Nehru College for Women",
    "campus": "South Campus",
    "location": "August Kranti Marg, Siri Fort, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Social Sciences",
      "Commerce",
      "Science"
    ],
    "type": "Women's",
    "courses": [
      "BA (Hons) Journalism",
      "BA (Hons) Psychology",
      "BA (Hons) Economics",
      "BCom (Hons)",
      "BSc (Hons) Mathematics"
    ],
    "about": "A constituent women's college on South Campus offering a diverse curriculum in humanities, journalism, psychology, commerce, and mathematics.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "kasturba-hospital",
    "slug": "kasturba-hospital",
    "name": "Kasturba Hospital",
    "campus": "Other / Specialized",
    "location": "Daryaganj, Near Jama Masjid, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Postgraduate Medical Residency",
      "Diploma in Obstetrics and Gynaecology (DGO)"
    ],
    "about": "A historic government hospital in Old Delhi affiliated with Delhi University for post-graduate residency and diploma programmes in obstetrics and gynecology.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "keshav-mahavidyalaya",
    "slug": "keshav-mahavidyalaya",
    "name": "Keshav Mahavidyalaya",
    "campus": "Off Campus",
    "location": "H-4-5 Zone, Rani Bagh, Pitampura, Delhi",
    "academicAreas": [
      "Science",
      "Management",
      "Commerce",
      "Arts & Humanities"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Electronics",
      "Bachelor of Management Studies (BMS)",
      "BCom (Hons)",
      "BA (Hons) Psychology",
      "BSc (Hons) Mathematics"
    ],
    "about": "A co-educational constituent college in Rani Bagh recognized for undergraduate courses in computer science, electronics, management studies, commerce, and psychology.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "kirori-mal-college",
    "slug": "kirori-mal-college",
    "name": "Kirori Mal College",
    "campus": "North Campus",
    "location": "University Enclave, North Campus, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Statistics",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Geography"
    ],
    "about": "A premier constituent college of Delhi University located on North Campus, renowned for its strong academic traditions in sciences, commerce, and liberal arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "lady-hardinge-medical-college",
    "slug": "lady-hardinge-medical-college",
    "name": "Lady Hardinge Medical College",
    "campus": "Other / Specialized",
    "location": "Connaught Place, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Bachelor of Medicine and Bachelor of Surgery (MBBS)",
      "MD",
      "MS"
    ],
    "about": "A historic pioneer medical institution established in 1916 and affiliated with DU, providing medical education and tertiary healthcare.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "lady-irwin-college",
    "slug": "lady-irwin-college",
    "name": "Lady Irwin College",
    "campus": "Off Campus",
    "location": "Sikandra Road, Mandi House, New Delhi",
    "academicAreas": [
      "Science",
      "Education",
      "Social Sciences"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Home Science",
      "BSc (Pass) Home Science",
      "Bachelor of Education (B.Ed)",
      "B.Ed Special Education"
    ],
    "about": "A pioneer women's constituent college of DU located at Mandi House, renowned for undergraduate and teacher education in home science and nutrition.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "lady-shri-ram-college-for-women",
    "slug": "lady-shri-ram-college-for-women",
    "name": "Lady Shri Ram College for Women",
    "campus": "South Campus",
    "location": "Lajpat Nagar IV, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Social Sciences",
      "Commerce",
      "Science",
      "Education"
    ],
    "type": "Women's",
    "courses": [
      "BA (Hons) Psychology",
      "BA (Hons) Economics",
      "BA (Hons) Journalism",
      "BCom (Hons)",
      "BSc (Hons) Statistics",
      "BSc (Hons) Mathematics",
      "Bachelor of Elementary Education (B.El.Ed)"
    ],
    "about": "A premier women's constituent college on South Campus, nationally acclaimed for undergraduate education in social sciences, humanities, commerce, statistics, and journalism.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "lakshmi-bai-college-for-women",
    "slug": "lakshmi-bai-college-for-women",
    "name": "Lakshmi Bai College for Women",
    "campus": "Off Campus",
    "location": "Ashok Vihar Phase III, Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Science"
    ],
    "type": "Women's",
    "courses": [
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Psychology",
      "BSc (Hons) Mathematics",
      "BA (Prog)"
    ],
    "about": "A constituent women's college of Delhi University in Ashok Vihar, offering degree courses in arts, humanities, commerce, and mathematical sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "maharaja-agarsen-college",
    "slug": "maharaja-agarsen-college",
    "name": "Maharaja Agarsen College",
    "campus": "Off Campus",
    "location": "Vasundhara Enclave, Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Science",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BA (Hons) Journalism",
      "BSc (Hons) Electronics",
      "BCom (Hons)",
      "BA (Hons) English",
      "BSc Physical Science with Computer Science"
    ],
    "about": "A co-educational constituent college in East Delhi offering undergraduate degree programmes in journalism, electronics, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "maharshi-valmiki-college-of-education",
    "slug": "maharshi-valmiki-college-of-education",
    "name": "Maharshi Valmiki College of Education",
    "campus": "Other / Specialized",
    "location": "Geeta Colony, Delhi",
    "academicAreas": [
      "Education",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Education (B.Ed)"
    ],
    "about": "A co-educational constituent teacher education college of the University of Delhi dedicated to training professional school educators through the B.Ed programme.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "maitreyi-college-for-women",
    "slug": "maitreyi-college-for-women",
    "name": "Maitreyi College for Women",
    "campus": "South Campus",
    "location": "Bapu Dham, Chanakyapuri, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Chemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A constituent women's college of DU in Chanakyapuri, offering diverse undergraduate degree courses in pure sciences, life sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "mata-sundri-college-for-women",
    "slug": "mata-sundri-college-for-women",
    "name": "Mata Sundri College for Women",
    "campus": "Off Campus",
    "location": "Mata Sundri Lane, Rouse Avenue, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Science",
      "Education"
    ],
    "type": "Women's",
    "courses": [
      "Bachelor of Elementary Education (B.El.Ed)",
      "BSc (Hons) Statistics",
      "BSc (Hons) Mathematics",
      "BSc (Hons) Computer Science",
      "BCom (Hons)",
      "BA (Hons) Psychology"
    ],
    "about": "A constituent women's college near Mandi House offering undergraduate courses in humanities, commerce, mathematical sciences, and elementary education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "maulana-azad-institute-of-dental-sciences",
    "slug": "maulana-azad-institute-of-dental-sciences",
    "name": "Maulana Azad Institute of Dental Sciences",
    "campus": "Other / Specialized",
    "location": "Bahadur Shah Zafar Marg, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Bachelor of Dental Surgery (BDS)",
      "Master of Dental Surgery (MDS)"
    ],
    "about": "India's premier autonomous dental medical institution, affiliated with the University of Delhi for undergraduate BDS and postgraduate MDS degree education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "maulana-azad-medical-college",
    "slug": "maulana-azad-medical-college",
    "name": "Maulana Azad Medical College",
    "campus": "Other / Specialized",
    "location": "Bahadur Shah Zafar Marg, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Bachelor of Medicine and Bachelor of Surgery (MBBS)",
      "MD",
      "MS"
    ],
    "about": "A prestigious government medical college established in 1958 and affiliated with DU, providing undergraduate medical education (MBBS) and residency training.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "miranda-house",
    "slug": "miranda-house",
    "name": "Miranda House",
    "campus": "North Campus",
    "location": "GC Narang Road, University Enclave, Delhi",
    "academicAreas": [
      "Science",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BSc (Hons) Mathematics",
      "BA (Hons) Economics",
      "BA (Hons) English"
    ],
    "about": "A premier constituent women's college on North Campus, nationally recognized for pioneering scientific research, laboratory education, and humanities excellence.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "moti-lal-nehru-college",
    "slug": "moti-lal-nehru-college",
    "name": "Moti Lal Nehru College",
    "campus": "South Campus",
    "location": "Benito Juarez Marg, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Political Science"
    ],
    "about": "A large co-educational constituent college on South Campus offering undergraduate degrees across physical sciences, commerce, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "moti-lal-nehru-college-evening",
    "slug": "moti-lal-nehru-college-evening",
    "name": "Moti Lal Nehru College (Evening)",
    "campus": "South Campus",
    "location": "Benito Juarez Marg, New Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) English",
      "BA (Hons) Political Science",
      "BA (Prog)"
    ],
    "about": "A constituent evening college located on South Campus providing degree education in commerce, humanities, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "national-institute-of-health-and-family-welfare",
    "slug": "national-institute-of-health-and-family-welfare",
    "name": "National Institute of Health & Family Welfare",
    "campus": "Other / Specialized",
    "location": "Munirka, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Postgraduate Diploma in Public Health Management",
      "Health Administration Fellowships"
    ],
    "about": "An autonomous apex technical institute under the Ministry of Health and Family Welfare, affiliated with DU for postgraduate public health education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "nehru-homeopathic-medical-college-and-hospital",
    "slug": "nehru-homeopathic-medical-college-and-hospital",
    "name": "Nehru Homeopathic Medical College & Hospital",
    "campus": "Other / Specialized",
    "location": "B-Block, Defence Colony, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Homeopathic Medicine and Surgery (BHMS)",
      "MD (Homeopathy)"
    ],
    "about": "A government homeopathic medical institution in Defence Colony affiliated with DU for clinical undergraduate BHMS and postgraduate medical education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "netaji-subhash-institute-of-technology",
    "slug": "netaji-subhash-institute-of-technology",
    "name": "Netaji Subhash Institute of Technology",
    "campus": "Other / Specialized",
    "location": "Sector 3, Dwarka, New Delhi",
    "academicAreas": [
      "Science",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "B.Tech Engineering Programmes (Historical DU Faculty of Technology)"
    ],
    "about": "The historical constituent engineering institute of the University of Delhi in Dwarka, which has transitioned into Netaji Subhas University of Technology.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "p-g-d-a-v-college",
    "slug": "p-g-d-a-v-college",
    "name": "P.G.D.A.V. College",
    "campus": "Off Campus",
    "location": "Ring Road, Nehru Nagar, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Management",
      "Arts & Humanities"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Statistics",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A co-educational constituent college of DU located on the Ring Road near Nehru Nagar, known for undergraduate mathematical sciences, statistics, commerce, and arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "p-g-d-a-v-college-evening",
    "slug": "p-g-d-a-v-college-evening",
    "name": "P.G.D.A.V. College (Evening)",
    "campus": "Off Campus",
    "location": "Ring Road, Nehru Nagar, New Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences",
      "Science"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BSc (Hons) Mathematics",
      "BA (Hons) Political Science",
      "BA (Prog)"
    ],
    "about": "A constituent evening college of Delhi University offering evening undergraduate degrees in commerce, mathematics, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "pt-deendayal-upadhyaya-institute-of-physically-handicapped",
    "slug": "pt-deendayal-upadhyaya-institute-of-physically-handicapped",
    "name": "Pt. Deendayal Upadhyaya Institute of Physically Handicapped",
    "campus": "Other / Specialized",
    "location": "4 Vishnu Digamber Marg, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Occupational Therapy (BOT)",
      "Bachelor of Physiotherapy (BPT)",
      "Bachelor of Prosthetics & Orthotics (BPO)"
    ],
    "about": "An autonomous institute under the Ministry of Social Justice and Empowerment, affiliated with DU for degree courses in physiotherapy, occupational therapy, and prosthetics.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "rajdhani-college",
    "slug": "rajdhani-college",
    "name": "Rajdhani College",
    "campus": "Off Campus",
    "location": "Mahatma Gandhi Marg, Raja Garden, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BSc (Hons) Electronics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A co-educational constituent college in West Delhi near Raja Garden, offering undergraduate courses in physical and applied sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "rajkumari-amrit-kaur-college-of-nursing",
    "slug": "rajkumari-amrit-kaur-college-of-nursing",
    "name": "Rajkumari Amrit Kaur College of Nursing",
    "campus": "Other / Specialized",
    "location": "Lajpat Nagar IV, Near Moolchand Metro, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Nursing",
      "Master of Nursing (M.Sc Nursing)"
    ],
    "about": "A premier government nursing institution in Lajpat Nagar established in 1946 and affiliated with DU for undergraduate and postgraduate nursing education.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "ram-lal-anand-college",
    "slug": "ram-lal-anand-college",
    "name": "Ram Lal Anand College",
    "campus": "South Campus",
    "location": "5 Benito Juarez Marg, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Microbiology",
      "BSc (Hons) Statistics",
      "BSc (Hons) Computer Science",
      "BSc (Hons) Geology",
      "BCom (Hons)",
      "BA (Hons) History"
    ],
    "about": "A constituent co-educational college on South Campus known for its specialized science departments including microbiology, statistics, and computer science.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "ramanujan-college",
    "slug": "ramanujan-college",
    "name": "Ramanujan College",
    "campus": "South Campus",
    "location": "CR Park Main Road, Near Kalkaji, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Management",
      "Arts & Humanities",
      "Vocational"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Statistics",
      "BSc (Hons) Computer Science",
      "Bachelor of Management Studies (BMS)",
      "BCom (Hons)",
      "B.Voc (Banking Operations)",
      "BA (Hons) Applied Psychology"
    ],
    "about": "A South Campus constituent college in Kalkaji recognized for innovative teaching, undergraduate management studies, statistics, data analytics, and vocational courses.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "ramjas-college",
    "slug": "ramjas-college",
    "name": "Ramjas College",
    "campus": "North Campus",
    "location": "University Enclave, North Campus, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "One of the founding colleges of Delhi University on North Campus, offering established programmes in pure sciences, life sciences, commerce, and liberal arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "satyawati-college",
    "slug": "satyawati-college",
    "name": "Satyawati College",
    "campus": "Off Campus",
    "location": "Ashok Vihar Phase III, Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences",
      "Science"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) History",
      "BA (Hons) Political Science",
      "BSc (Hons) Mathematics"
    ],
    "about": "A co-educational constituent college in Ashok Vihar named after freedom fighter Behen Satyawati, offering degrees in commerce, economics, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "satyawati-college-evening",
    "slug": "satyawati-college-evening",
    "name": "Satyawati College (Evening)",
    "campus": "Off Campus",
    "location": "Ashok Vihar Phase III, Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) Political Science",
      "BA (Hons) English",
      "BA (Prog)"
    ],
    "about": "A constituent evening college in Ashok Vihar offering undergraduate degree courses in commerce, humanities, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "school-of-open-learning-erstwhile-school-of-correspondence-continuing-education",
    "slug": "school-of-open-learning-erstwhile-school-of-correspondence-continuing-education",
    "name": "School of Open Learning ( Erstwhile School of Correspondence & Continuing Education)",
    "campus": "North Campus",
    "location": "5 Cavalry Lane, University of Delhi, Delhi",
    "academicAreas": [
      "Open Learning",
      "Commerce",
      "Arts & Humanities",
      "Management",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "Bachelor of Management Studies (BMS)",
      "BA (Hons) English",
      "BA (Hons) Political Science",
      "BA (Prog)"
    ],
    "about": "The pioneer distance education institution of the University of Delhi, enabling accessible higher education across commerce, management, and humanities programmes.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "school-of-rehabilitation-sciences",
    "slug": "school-of-rehabilitation-sciences",
    "name": "School of Rehabilitation Sciences",
    "campus": "Other / Specialized",
    "location": "Hauz Khas, New Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "Specialized Rehabilitation Training Programmes"
    ],
    "about": "A specialized institution associated with Delhi University for professional studies, clinical practice, and research in developmental and rehabilitation sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shaheed-bhagat-singh-college",
    "slug": "shaheed-bhagat-singh-college",
    "name": "Shaheed Bhagat Singh College",
    "campus": "South Campus",
    "location": "Sheikh Sarai Phase II, New Delhi",
    "academicAreas": [
      "Commerce",
      "Social Sciences",
      "Arts & Humanities",
      "Science"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Geography",
      "BSc (Hons) Mathematics",
      "BA (Hons) Political Science"
    ],
    "about": "A leading South Campus constituent college recognized for its distinguished commerce, economics, geography, and social science faculties.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shaheed-bhagat-singh-college-evening",
    "slug": "shaheed-bhagat-singh-college-evening",
    "name": "Shaheed Bhagat Singh College (Evening)",
    "campus": "South Campus",
    "location": "Sheikh Sarai Phase II, New Delhi",
    "academicAreas": [
      "Commerce",
      "Social Sciences",
      "Arts & Humanities"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) Geography",
      "BA (Hons) Political Science",
      "BA (Prog)"
    ],
    "about": "A constituent evening co-educational college on South Campus providing degree education in commerce, geography, economics, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shaheed-rajguru-college-of-applied-sciences-for-women",
    "slug": "shaheed-rajguru-college-of-applied-sciences-for-women",
    "name": "Shaheed Rajguru College of Applied Sciences for Women",
    "campus": "Off Campus",
    "location": "Vasundhara Enclave, East Delhi, Delhi",
    "academicAreas": [
      "Science",
      "Management",
      "Commerce"
    ],
    "type": "Women's",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Biomedical Science",
      "BSc (Hons) Food Technology",
      "BSc (Hons) Biochemistry",
      "Bachelor of Management Studies (BMS)",
      "BBA (FIA)",
      "BCom (Hons)"
    ],
    "about": "A premier constituent women's college in East Delhi offering specialized degrees in applied sciences, computer science, management studies, and technology.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shaheed-sukhdev-college-of-business-studies",
    "slug": "shaheed-sukhdev-college-of-business-studies",
    "name": "Shaheed Sukhdev College of Business Studies",
    "campus": "Off Campus",
    "location": "PSP Area IV, Dr. K.N. Katju Marg, Sector 16, Rohini, Delhi",
    "academicAreas": [
      "Management",
      "Science",
      "Commerce"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Management Studies (BMS)",
      "BBA (Financial and Investment Analysis)",
      "BSc (Hons) Computer Science"
    ],
    "about": "India's premier undergraduate management and computer science institution under Delhi University, known for its BMS, BBA (FIA), and computer science programmes.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shivaji-college",
    "slug": "shivaji-college",
    "name": "Shivaji College",
    "campus": "Off Campus",
    "location": "Ring Road, Raja Garden, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A leading co-educational constituent college in West Delhi offering a wide range of undergraduate degree courses in sciences, commerce, and liberal arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shri-ram-college-of-commerce",
    "slug": "shri-ram-college-of-commerce",
    "name": "Shri Ram College of Commerce",
    "campus": "North Campus",
    "location": "University Enclave, Maurice Nagar, Delhi",
    "academicAreas": [
      "Commerce",
      "Management",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Commerce (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "India's premier constituent college for commerce and economics education, located on North Campus and renowned for its BCom (Hons) and BA (Hons) Economics programmes.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shyam-lal-college",
    "slug": "shyam-lal-college",
    "name": "Shyam Lal College",
    "campus": "Off Campus",
    "location": "G.T. Road, Shahdara, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BSc Physical Science",
      "BCom (Hons)",
      "BA (Hons) Economics",
      "BA (Hons) Political Science"
    ],
    "about": "A constituent co-educational college in East Delhi near Shahdara offering undergraduate degree programmes in physical sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shyam-lal-college-evening",
    "slug": "shyam-lal-college-evening",
    "name": "Shyam Lal College (Evening)",
    "campus": "Off Campus",
    "location": "G.T. Road, Shahdara, Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) Political Science",
      "BA (Hons) Economics",
      "BA (Prog)"
    ],
    "about": "A constituent evening college in Shahdara offering evening undergraduate programmes in commerce, humanities, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "shyama-prasad-mukherji-college-for-women",
    "slug": "shyama-prasad-mukherji-college-for-women",
    "name": "Shyama Prasad Mukherji College for Women",
    "campus": "Off Campus",
    "location": "Punjabi Bagh West, New Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Science",
      "Education"
    ],
    "type": "Women's",
    "courses": [
      "Bachelor of Elementary Education (B.El.Ed)",
      "BSc (Hons) Computer Science",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Applied Psychology"
    ],
    "about": "A constituent women's college in West Delhi offering degree programmes in computer science, mathematics, teacher education, commerce, and liberal arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "sri-aurobindo-college",
    "slug": "sri-aurobindo-college",
    "name": "Sri Aurobindo College",
    "campus": "South Campus",
    "location": "Malviya Nagar, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Electronics",
      "BSc Life Sciences",
      "BSc Physical Science",
      "BCom (Hons)",
      "BA (Hons) Political Science",
      "BA (Hons) Economics"
    ],
    "about": "A constituent co-educational college in South Delhi offering undergraduate programmes in electronics, life sciences, physical sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "sri-aurobindo-college-evening",
    "slug": "sri-aurobindo-college-evening",
    "name": "Sri Aurobindo College (Evening)",
    "campus": "South Campus",
    "location": "Malviya Nagar, New Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) Applied Psychology",
      "BA (Hons) Economics",
      "BA (Prog)"
    ],
    "about": "A constituent evening college in Malviya Nagar providing degree courses in commerce, applied psychology, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "sri-guru-gobind-singh-college-of-commerce",
    "slug": "sri-guru-gobind-singh-college-of-commerce",
    "name": "Sri Guru Gobind Singh College of Commerce",
    "campus": "Off Campus",
    "location": "Opposite TV Tower, Pitampura, Delhi",
    "academicAreas": [
      "Commerce",
      "Management",
      "Science",
      "Arts & Humanities"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "Bachelor of Management Studies (BMS)",
      "BA (Hons) Business Economics (BBE)",
      "BSc (Hons) Computer Science",
      "BA (Hons) Economics"
    ],
    "about": "A premier constituent college in Pitampura known for excellence in commerce, business economics, management studies, and computer science.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "sri-guru-nanak-dev-khalsa-college",
    "slug": "sri-guru-nanak-dev-khalsa-college",
    "name": "Sri Guru Nanak Dev Khalsa College",
    "campus": "Off Campus",
    "location": "Dev Nagar, Karol Bagh, New Delhi",
    "academicAreas": [
      "Commerce",
      "Management",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "Bachelor of Management Studies (BMS)",
      "BA (Hons) Business Economics (BBE)",
      "BA (Hons) English",
      "BA (Hons) Punjabi"
    ],
    "about": "A constituent co-educational college in Karol Bagh offering undergraduate programmes in commerce, management studies, business economics, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "sri-guru-tegh-bahadur-khalsa-college",
    "slug": "sri-guru-tegh-bahadur-khalsa-college",
    "name": "Sri Guru Tegh Bahadur Khalsa College",
    "campus": "North Campus",
    "location": "University Enclave, North Campus, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Computer Science",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A prominent North Campus constituent college offering extensive undergraduate programmes in physical and life sciences, commerce, and social sciences.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "sri-venkateswara-college",
    "slug": "sri-venkateswara-college",
    "name": "Sri Venkateswara College",
    "campus": "South Campus",
    "location": "Benito Juarez Marg, Dhaula Kuan, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Biological Sciences",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Statistics",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Economics"
    ],
    "about": "A premier South Campus constituent college of Delhi University, renowned for distinguished science, commerce, and humanities departments.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "st-stephens-college",
    "slug": "st-stephens-college",
    "name": "St. Stephen's College",
    "campus": "North Campus",
    "location": "University Enclave, North Campus, Delhi",
    "academicAreas": [
      "Science",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Mathematics",
      "BA (Hons) Economics",
      "BA (Hons) English",
      "BA (Hons) History",
      "BA (Hons) Philosophy"
    ],
    "about": "One of India's oldest and most renowned liberal arts and science institutions, founded in 1881 and located on North Campus.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "swami-shraddhanand-college",
    "slug": "swami-shraddhanand-college",
    "name": "Swami Shraddhanand College",
    "campus": "Off Campus",
    "location": "Alipur, Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Microbiology",
      "BSc (Hons) Physics",
      "BSc (Hons) Chemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BCom (Hons)"
    ],
    "about": "A constituent college in Alipur, North Delhi, offering extensive undergraduate education in sciences, microbiology, commerce, and liberal arts.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "university-college-of-medical-sciences",
    "slug": "university-college-of-medical-sciences",
    "name": "University College of Medical Sciences",
    "campus": "Other / Specialized",
    "location": "Dilshad Garden, Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Co-educational",
    "courses": [
      "Bachelor of Medicine and Bachelor of Surgery (MBBS)",
      "BSc (Medical Technology) Radiography",
      "MD",
      "MS"
    ],
    "about": "A premier government medical college founded by the University of Delhi, associated with Guru Teg Bahadur Hospital for medical education and research.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "vallabhbhai-patel-chest-institute",
    "slug": "vallabhbhai-patel-chest-institute",
    "name": "Vallabhbhai Patel Chest Institute",
    "campus": "North Campus",
    "location": "University Enclave, North Campus, Delhi",
    "academicAreas": [
      "Medicine / Health",
      "Specialized"
    ],
    "type": "Specialized",
    "courses": [
      "MD (Pulmonary Medicine)",
      "PhD (Medical Sciences)"
    ],
    "about": "A postgraduate medical institute maintained by DU on North Campus, devoted to research, teaching, and patient care in chest and respiratory diseases.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "vivekananda-college",
    "slug": "vivekananda-college",
    "name": "Vivekananda College",
    "campus": "Off Campus",
    "location": "Vivek Vihar, Delhi",
    "academicAreas": [
      "Arts & Humanities",
      "Commerce",
      "Social Sciences",
      "Science"
    ],
    "type": "Women's",
    "courses": [
      "BA (Hons) Applied Psychology",
      "BCom (Hons)",
      "BSc (Hons) Mathematics",
      "BA (Hons) English",
      "BA (Hons) Political Science"
    ],
    "about": "A constituent women's college of Delhi University in Vivek Vihar, East Delhi, offering undergraduate courses in humanities, commerce, and applied psychology.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "zakir-husain-delhi-college",
    "slug": "zakir-husain-delhi-college",
    "name": "Zakir Husain Delhi College",
    "campus": "Off Campus",
    "location": "Jawaharlal Nehru Marg, Opp. Ramlila Ground, New Delhi",
    "academicAreas": [
      "Science",
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BSc (Hons) Chemistry",
      "BSc (Hons) Botany",
      "BSc (Hons) Zoology",
      "BSc (Hons) Electronics",
      "BSc (Hons) Mathematics",
      "BCom (Hons)",
      "BA (Hons) Psychology"
    ],
    "about": "The oldest existing educational institution in Delhi, offering comprehensive undergraduate degree programmes in pure sciences, life sciences, commerce, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "id": "zakir-husain-post-graduate-evening-college",
    "slug": "zakir-husain-post-graduate-evening-college",
    "name": "Zakir Husain Post Graduate Evening College",
    "campus": "Off Campus",
    "location": "Jawaharlal Nehru Marg, Opp. Ramlila Ground, New Delhi",
    "academicAreas": [
      "Commerce",
      "Arts & Humanities",
      "Social Sciences"
    ],
    "type": "Co-educational",
    "courses": [
      "BCom (Hons)",
      "BCom (Prog)",
      "BA (Hons) Economics",
      "BA (Hons) History",
      "BA (Hons) Political Science",
      "BA (Prog)"
    ],
    "about": "A constituent evening college of Delhi University providing evening undergraduate degree education in commerce, economics, and humanities.",
    "heroImageUrl": null,
    "createdAt": "2026-01-01T00:00:00Z"
  }
];

export const colleges: CollegeRecord[] = officialDuColleges;
