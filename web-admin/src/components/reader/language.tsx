"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ReaderLanguage = "en" | "ta";

const STORAGE_KEY = "nilgiri-news:lang";

interface LanguageState {
  lang: ReaderLanguage;
  setLang: (next: ReaderLanguage) => void;
  /**
   * Returns the Tamil value when Tamil is selected and the field is actually
   * filled, otherwise the English one. Falling back rather than showing a blank
   * is the whole reason articles can be published English-only.
   */
  pick: (en: string, ta: string) => string;
  /** The lang attribute to stamp on the element that `pick` fed. */
  langAttr: (en: string, ta: string) => ReaderLanguage;
}

const LanguageContext = createContext<LanguageState | null>(null);

function readStored(): ReaderLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "ta" ? "ta" : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser, so the stored preference is read once rather than in an
  // effect that would flash English first.
  const [lang, setLangState] = useState<ReaderLanguage>(readStored);

  const setLang = useCallback((next: ReaderLanguage) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage API is not worth breaking the page over.
    }
  }, []);

  const value = useMemo<LanguageState>(() => {
    const pick = (en: string, ta: string) =>
      lang === "ta" && ta.trim() ? ta : en;
    const langAttr = (en: string, ta: string): ReaderLanguage =>
      lang === "ta" && ta.trim() ? "ta" : "en";
    return { lang, setLang, pick, langAttr };
  }, [lang, setLang]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return context;
}
