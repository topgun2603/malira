import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";

/** Collection names live here so a rename is a one-line change. */
export const COLLECTIONS = {
  users: "users",
  articles: "articles",
  categories: "categories",
  activity: "activity",
  events: "events",
  playlists: "playlists",
  notifications: "notifications",
  settings: "settings",
} as const;

function typed<T = DocumentData>(name: string): CollectionReference<T> {
  return collection(db, name) as CollectionReference<T>;
}

export const usersCol = () => typed(COLLECTIONS.users);
export const articlesCol = () => typed(COLLECTIONS.articles);
export const categoriesCol = () => typed(COLLECTIONS.categories);
export const activityCol = () => typed(COLLECTIONS.activity);

export const userDoc = (id: string) => doc(db, COLLECTIONS.users, id);
export const articleDoc = (id: string) => doc(db, COLLECTIONS.articles, id);
export const categoryDoc = (id: string) => doc(db, COLLECTIONS.categories, id);
