/**
 * Demo matrimony profiles.
 *
 * These are invented people. Names are single given names common across the
 * Nilgiris with no surname, so no real family is implied; no phone number or
 * email is included, because India has no reserved fictional dialling range and
 * any plausible number belongs to somebody.
 *
 * Every document is flagged isSample and can be removed in one action from the
 * dashboard. They cannot respond to an interest — there is no account behind
 * them — which is stated on the card in the admin queue.
 */

export interface SampleMatrimonyProfile {
  /** Deterministic id, so re-seeding cannot create duplicates. */
  id: string;
  name: string;
  gender: "male" | "female";
  /** Years, converted to a date of birth at seed time. */
  age: number;
  heightCm: number;
  education: string;
  occupation: string;
  workLocation: string;
  hometown: string;
  diet: "vegetarian" | "non_vegetarian" | "eggetarian";
  maritalStatus: "never_married" | "divorced" | "widowed";
  postedBy: "self" | "parent" | "sibling" | "relative";
  photoVisibility: "members" | "on_accept";
  about: string;
  fatherOccupation: string;
  motherOccupation: string;
  siblings: string;
  birthPlace: string;
  birthTime: string;
  /** Gradient for the generated placeholder avatar. */
  artwork: [string, string];
}

export const SAMPLE_MATRIMONY: SampleMatrimonyProfile[] = [
  {
    id: "sample-mat-01",
    name: "Bellie",
    gender: "female",
    age: 26,
    heightCm: 158,
    education: "B.Sc Nursing",
    occupation: "Staff nurse",
    workLocation: "Coimbatore",
    hometown: "Kotagiri",
    diet: "vegetarian",
    maritalStatus: "never_married",
    postedBy: "parent",
    photoVisibility: "on_accept",
    about:
      "Working in a hospital in Coimbatore, comes home most weekends. Looking for someone settled, preferably within the district or a short drive from it.",
    fatherOccupation: "Tea grower",
    motherOccupation: "Homemaker",
    siblings: "One younger brother, studying",
    birthPlace: "Kotagiri",
    birthTime: "05:40",
    artwork: ["#1f6140", "#4f9b63"],
  },
  {
    id: "sample-mat-02",
    name: "Jogi",
    gender: "male",
    age: 30,
    heightCm: 172,
    education: "B.E Mechanical",
    occupation: "Maintenance engineer",
    workLocation: "Bengaluru",
    hometown: "Coonoor",
    diet: "non_vegetarian",
    maritalStatus: "never_married",
    postedBy: "self",
    photoVisibility: "members",
    about:
      "Working in Bengaluru for six years, planning to move back to the hills within a year or two. Family runs a small estate near Coonoor.",
    fatherOccupation: "Retired, estate",
    motherOccupation: "Homemaker",
    siblings: "One elder sister, married",
    birthPlace: "Coonoor",
    birthTime: "22:15",
    artwork: ["#274b6d", "#4d82b3"],
  },
  {
    id: "sample-mat-03",
    name: "Hemmi",
    gender: "female",
    age: 24,
    heightCm: 160,
    education: "M.A English",
    occupation: "School teacher",
    workLocation: "Ooty",
    hometown: "Ooty",
    diet: "vegetarian",
    maritalStatus: "never_married",
    postedBy: "self",
    photoVisibility: "on_accept",
    about:
      "Teaching at a higher secondary school in Ooty. Would prefer someone who intends to stay in the district.",
    fatherOccupation: "Government service",
    motherOccupation: "Teacher",
    siblings: "Two brothers, both younger",
    birthPlace: "Ooty",
    birthTime: "11:05",
    artwork: ["#6d3a5f", "#96547f"],
  },
  {
    id: "sample-mat-04",
    name: "Madha",
    gender: "male",
    age: 33,
    heightCm: 168,
    education: "B.Com",
    occupation: "Runs a provision store",
    workLocation: "Kotagiri",
    hometown: "Kotagiri",
    diet: "non_vegetarian",
    maritalStatus: "divorced",
    postedBy: "sibling",
    photoVisibility: "on_accept",
    about:
      "Runs the family shop in Kotagiri. Divorced four years ago, no children. Looking to settle again with someone from a similar background.",
    fatherOccupation: "Late",
    motherOccupation: "Homemaker",
    siblings: "One elder sister, married",
    birthPlace: "Kotagiri",
    birthTime: "03:20",
    artwork: ["#8a4b1f", "#c07a34"],
  },
  {
    id: "sample-mat-05",
    name: "Rangi",
    gender: "female",
    age: 28,
    heightCm: 155,
    education: "MBA Finance",
    occupation: "Bank officer",
    workLocation: "Mysuru",
    hometown: "Aravankadu",
    diet: "eggetarian",
    maritalStatus: "never_married",
    postedBy: "parent",
    photoVisibility: "members",
    about:
      "Posted in Mysuru, transfer to Coimbatore expected next year. Family would like the match to be from the Nilgiris.",
    fatherOccupation: "Estate supervisor",
    motherOccupation: "Homemaker",
    siblings: "One younger sister, studying",
    birthPlace: "Aravankadu",
    birthTime: "18:50",
    artwork: ["#2c6b34", "#77a83f"],
  },
  {
    id: "sample-mat-06",
    name: "Kariya",
    gender: "male",
    age: 27,
    heightCm: 175,
    education: "Diploma, Agriculture",
    occupation: "Manages the family estate",
    workLocation: "Kundah",
    hometown: "Kundah",
    diet: "non_vegetarian",
    maritalStatus: "never_married",
    postedBy: "parent",
    photoVisibility: "on_accept",
    about:
      "Manages twelve acres of tea and vegetables. Has no intention of leaving the hills, and would prefer someone who feels the same.",
    fatherOccupation: "Tea grower",
    motherOccupation: "Tea grower",
    siblings: "Two elder brothers, both married",
    birthPlace: "Kundah",
    birthTime: "07:10",
    artwork: ["#8a6a1f", "#bc9538"],
  },
  {
    id: "sample-mat-07",
    name: "Thangi",
    gender: "female",
    age: 31,
    heightCm: 162,
    education: "B.Sc Computer Science",
    occupation: "Software tester",
    workLocation: "Chennai",
    hometown: "Coonoor",
    diet: "vegetarian",
    maritalStatus: "widowed",
    postedBy: "relative",
    photoVisibility: "on_accept",
    about:
      "Working in Chennai. Widowed two years ago, one daughter aged four. Looking for an understanding partner.",
    fatherOccupation: "Retired teacher",
    motherOccupation: "Homemaker",
    siblings: "One elder brother, married",
    birthPlace: "Coonoor",
    birthTime: "14:35",
    artwork: ["#3f4a48", "#5c6b68"],
  },
  {
    id: "sample-mat-08",
    name: "Bella",
    gender: "male",
    age: 29,
    heightCm: 170,
    education: "B.A History, B.Ed",
    occupation: "Government school teacher",
    workLocation: "Gudalur",
    hometown: "Gudalur",
    diet: "vegetarian",
    maritalStatus: "never_married",
    postedBy: "self",
    photoVisibility: "members",
    about:
      "Teaching in a government school near Gudalur. Interested in someone with a similar profession or outlook.",
    fatherOccupation: "Farmer",
    motherOccupation: "Homemaker",
    siblings: "One younger sister, working",
    birthPlace: "Gudalur",
    birthTime: "09:25",
    artwork: ["#2c6b34", "#5a9440"],
  },
];
