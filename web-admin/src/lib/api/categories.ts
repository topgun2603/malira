import {
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { categoriesCol, categoryDoc } from "@/lib/firebase/collections";
import { slugify } from "@/lib/slug";
import type { Category } from "@/lib/types";

/** Seeded on first run so the panel is never staring at an empty feed. */
export const DEFAULT_CATEGORIES: Omit<Category, "id" | "createdAt">[] = [
  { name: "Local", nameTa: "உள்ளூர்", slug: "local", order: 1, active: true },
  { name: "Community", nameTa: "சமூகம்", slug: "community", order: 2, active: true },
  { name: "Government", nameTa: "அரசு", slug: "government", order: 3, active: true },
  {
    name: "Agriculture & Tea",
    nameTa: "விவசாயம் & தேயிலை",
    slug: "agriculture-tea",
    order: 4,
    active: true,
  },
  { name: "Sports", nameTa: "விளையாட்டு", slug: "sports", order: 5, active: true },
  { name: "Obituaries", nameTa: "இரங்கல்", slug: "obituaries", order: 6, active: true },
  {
    name: "Announcements",
    nameTa: "அறிவிப்புகள்",
    slug: "announcements",
    order: 7,
    active: true,
  },
];

export async function listCategories(): Promise<Category[]> {
  const snapshot = await getDocs(query(categoriesCol(), orderBy("order", "asc")));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

export async function createCategory(
  input: Pick<Category, "name" | "nameTa" | "order" | "active">,
): Promise<string> {
  const ref = await addDoc(categoriesCol(), {
    ...input,
    slug: slugify(input.name),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(
  id: string,
  input: Partial<Pick<Category, "name" | "nameTa" | "order" | "active">>,
): Promise<void> {
  const patch: Record<string, unknown> = { ...input };
  if (input.name) patch.slug = slugify(input.name);
  await updateDoc(categoryDoc(id), patch);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(categoryDoc(id));
}

export async function seedCategories(): Promise<number> {
  const existing = await listCategories();
  if (existing.length > 0) return 0;
  await Promise.all(
    DEFAULT_CATEGORIES.map((category) =>
      addDoc(categoriesCol(), { ...category, createdAt: serverTimestamp() }),
    ),
  );
  return DEFAULT_CATEGORIES.length;
}
