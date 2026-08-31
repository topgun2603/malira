"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Crown, HeartHandshake, Inbox, Search, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { MatrimonyProfileCard } from "@/components/matrimony/profile-card";
import { SubscribeWall } from "@/components/matrimony/subscribe-wall";
import { useProfileSearch, useReceivedInterests } from "@/hooks/use-matrimony";
import { useEntitlement } from "@/hooks/use-subscription";
import { useLanguage } from "@/components/reader/language";
import {
  DIETS,
  DIET_LABELS,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  type Diet,
  type MaritalStatus,
} from "@/lib/types";

export function MatrimonyBrowse() {
  const { lang } = useLanguage();
  const { premium, freeProfileViews } = useEntitlement();

  const [gender, setGender] = useState<"male" | "female" | "all">("all");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "all">("all");
  const [diet, setDiet] = useState<Diet | "all">("all");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [search, setSearch] = useState("");

  const [suggestOpen, setSuggestOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profiles, isLoading } = useProfileSearch({
    gender,
    maritalStatus,
    diet,
    minAge: minAge ? Number(minAge) : undefined,
    maxAge: maxAge ? Number(maxAge) : undefined,
    search,
  });

  // The same page with the term removed.
  //
  // Suggestions have to be drawn from the profiles the term has not yet ruled
  // out — taking them from the results would only ever offer back what is
  // already on screen. The key is stable while somebody types, so this is
  // fetched once and answered from cache for every keystroke after.
  const { data: pool } = useProfileSearch({
    gender,
    maritalStatus,
    diet,
    minAge: minAge ? Number(minAge) : undefined,
    maxAge: maxAge ? Number(maxAge) : undefined,
    search: "",
  });

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const profile of pool ?? []) {
      for (const candidate of [
        profile.name,
        profile.hometown,
        profile.occupation,
      ]) {
        const value = candidate?.trim();
        if (!value) continue;
        const lower = value.toLowerCase();
        // Offering back exactly what is already typed gains nothing.
        if (lower === term || !lower.includes(term)) continue;
        if (seen.has(lower)) continue;
        seen.add(lower);
        out.push(value);
        if (out.length === 6) return out;
      }
    }
    return out;
  }, [pool, search]);

  const { data: received } = useReceivedInterests();
  const pending = (received ?? []).filter((i) => i.status === "sent").length;

  const all = profiles ?? [];
  // Capped at the results boundary rather than in the query: the count of what
  // is held back is itself the argument for upgrading, and it has to be honest.
  const visible = premium ? all : all.slice(0, freeProfileViews);
  const hidden = all.length - visible.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {lang === "ta" ? "திருமணத் தகவல்" : "Matrimony"}
            </h1>
            {premium && (
              <Badge className="gap-1 font-normal">
                <Crown className="size-3" />
                Premium
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {lang === "ta"
              ? "இருவரும் சம்மதித்தால் மட்டுமே தொடர்பு விவரங்கள் பரிமாறப்படும்."
              : "Contact details are exchanged on a mutual accept, never listed."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/matrimony/me">
              <Inbox className="size-4" />
              {lang === "ta" ? "விருப்பங்கள்" : "Interests"}
              {pending > 0 && (
                <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs">
                  {pending}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/matrimony/me">
              <UserRound className="size-4" />
              {lang === "ta" ? "என் விவரங்கள்" : "My profile"}
            </Link>
          </Button>
        </div>
      </div>

      {/* ------------------------------ filters --------------------------- */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Label className="mb-1.5 block text-xs">
            {lang === "ta" ? "தேடு" : "Search"}
          </Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              placeholder={
                lang === "ta" ? "கல்வி, தொழில், ஊர்" : "Education, work, town"
              }
              className="pr-9 pl-9"
              onChange={(event) => {
                setSearch(event.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              // Closing on blur has to outlast the click that caused it, or
              // choosing a suggestion would dismiss the list before the mousedown
              // ever reaches it.
              onBlur={() => {
                blurTimer.current = setTimeout(() => setSuggestOpen(false), 120);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSuggestOpen(false);
                }}
                aria-label={lang === "ta" ? "தேடலை அழி" : "Clear search"}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-4" />
              </button>
            )}
            {suggestOpen && suggestions.length > 0 && (
              <ul className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border shadow-md">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                      onMouseDown={() => {
                        if (blurTimer.current) clearTimeout(blurTimer.current);
                      }}
                      onClick={() => {
                        setSearch(suggestion);
                        setSuggestOpen(false);
                      }}
                    >
                      <Search className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">
            {lang === "ta" ? "தேடுவது" : "Looking for"}
          </Label>
          <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              <SelectItem value="female">Bride</SelectItem>
              <SelectItem value="male">Groom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">
            {lang === "ta" ? "திருமண நிலை" : "Marital status"}
          </Label>
          <Select
            value={maritalStatus}
            onValueChange={(v) => setMaritalStatus(v as MaritalStatus | "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {MARITAL_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {MARITAL_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">
            {lang === "ta" ? "உணவு" : "Diet"}
          </Label>
          <Select value={diet} onValueChange={(v) => setDiet(v as Diet | "all")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {DIETS.map((value) => (
                <SelectItem key={value} value={value}>
                  {DIET_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs">
              {lang === "ta" ? "வயது" : "Age from"}
            </Label>
            <Input
              type="number"
              min={18}
              max={100}
              value={minAge}
              onChange={(event) => setMinAge(event.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label className="mb-1.5 block text-xs">
              {lang === "ta" ? "வரை" : "to"}
            </Label>
            <Input
              type="number"
              min={18}
              max={100}
              value={maxAge}
              onChange={(event) => setMaxAge(event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------ results --------------------------- */}
      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title={lang === "ta" ? "பொருந்தும் விவரங்கள் இல்லை" : "No profiles match"}
            description={
              lang === "ta"
                ? "வடிகட்டலை மாற்றிப் பாருங்கள்."
                : "Widen the filters. Every profile is reviewed before it appears, so new ones arrive steadily."
            }
          />
        ) : (
          <>
            <p className="text-muted-foreground mb-4 text-sm">
              {premium
                ? `${all.length} ${all.length === 1 ? "profile" : "profiles"}`
                : `Showing ${visible.length} of ${all.length}`}
            </p>

            <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map((profile) => (
                <StaggerItem key={profile.id}>
                  <MatrimonyProfileCard profile={profile} />
                </StaggerItem>
              ))}
            </StaggerList>

            {hidden > 0 && (
              <div className="mt-8">
                <SubscribeWall hidden={hidden} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
