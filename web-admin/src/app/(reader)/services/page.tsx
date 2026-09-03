"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Search, Star, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { useLanguage } from "@/components/reader/language";
import { useVendorSearch } from "@/hooks/use-vendors";
import { cn } from "@/lib/utils";
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
  VENDOR_CATEGORY_LABELS_TA,
  type Vendor,
  type VendorCategory,
} from "@/lib/types";

/**
 * The wedding services directory.
 *
 * Public, with no sign-in. A hall is a business that wants to be advertised,
 * and one that could only be seen by members would be worth little to the
 * vendor paying for it and nothing to a family searching the web at midnight.
 */
export default function ServicesPage() {
  const { lang } = useLanguage();
  const ta = lang === "ta";

  const [category, setCategory] = useState<VendorCategory | "all">("all");
  const [town, setTown] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useVendorSearch({
    category: category === "all" ? undefined : category,
    town,
    search,
  });

  const label = (value: VendorCategory) =>
    ta ? VENDOR_CATEGORY_LABELS_TA[value] : VENDOR_CATEGORY_LABELS[value];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {ta ? "திருமண சேவைகள்" : "Wedding services"}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          {ta
            ? "நீலகிரியில் மண்டபம், சமையல், புகைப்படம், அலங்காரம், வாகனம், இசை."
            : "Halls, catering, photography, decoration, transport and music, from businesses across the Nilgiris."}
        </p>
      </header>

      {/* Categories first: it is the question people arrive with. */}
      <div className="mb-5 flex flex-wrap gap-2">
        <CategoryChip
          active={category === "all"}
          onClick={() => setCategory("all")}
        >
          {ta ? "அனைத்தும்" : "Everything"}
        </CategoryChip>
        {VENDOR_CATEGORIES.map((value) => (
          <CategoryChip
            key={value}
            active={category === value}
            onClick={() => setCategory(value)}
          >
            {label(value)}
          </CategoryChip>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Label className="mb-1.5 block text-xs">
            {ta ? "தேடு" : "Search"}
          </Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              className="pl-9"
              placeholder={ta ? "பெயர், ஊர்" : "Name or place"}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">{ta ? "ஊர்" : "Town"}</Label>
          <Input
            value={town}
            placeholder={ta ? "ஊட்டி, கோத்தகிரி…" : "Ooty, Kotagiri…"}
            onChange={(event) => setTown(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={Store}
          title={ta ? "இங்கே எதுவும் இல்லை" : "Nothing here yet"}
          description={
            ta
              ? "வேறு வகையைத் தேர்வு செய்யுங்கள், அல்லது வடிகட்டலை நீக்குங்கள்."
              : "Try another category, or clear the filters. New businesses are listed as they are approved."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/services/mine">
                {ta ? "உங்கள் நிறுவனத்தைப் பதிவு செய்" : "List your business"}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground mb-4 text-sm">
            {data.length}{" "}
            {ta ? "நிறுவனங்கள்" : data.length === 1 ? "business" : "businesses"}
          </p>
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((vendor) => (
              <StaggerItem key={vendor.id}>
                <VendorCard vendor={vendor} />
              </StaggerItem>
            ))}
          </StaggerList>
        </>
      )}

      <div className="border-border mt-12 rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">
          {ta ? "உங்கள் நிறுவனத்தைப் பதிவு செய்யுங்கள்" : "Run one of these?"}
        </p>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm">
          {ta
            ? "விவரங்களை அனுப்புங்கள். பரிசீலனைக்குப் பிறகு வெளியிடப்படும்."
            : "List it here. Every listing is read by a person before it appears."}
        </p>
        <Button className="mt-4" asChild>
          <Link href="/services/mine">
            {ta ? "தொடங்கு" : "List your business"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "hover:bg-muted text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const photo = vendor.photos[0];

  return (
    <Link href={`/services/${vendor.id}`} className="block h-full">
      <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="bg-muted relative aspect-[4/3]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <Store className="size-8" />
            </div>
          )}
          {vendor.featured && (
            <Badge className="absolute top-2 left-2 gap-1">
              <Star className="size-3" />
              {ta ? "சிறப்பு" : "Featured"}
            </Badge>
          )}
        </div>

        <CardContent className="space-y-1.5 p-4">
          <p className="font-medium">{vendor.name}</p>
          <p className="text-muted-foreground text-xs">
            {ta
              ? VENDOR_CATEGORY_LABELS_TA[vendor.category]
              : VENDOR_CATEGORY_LABELS[vendor.category]}
          </p>

          {vendor.town && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5 shrink-0" />
              {vendor.town}
            </p>
          )}
          {vendor.capacity > 0 && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Users className="size-3.5 shrink-0" />
              {ta ? `${vendor.capacity} பேர்` : `Seats ${vendor.capacity}`}
            </p>
          )}
          {vendor.phone && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Phone className="size-3.5 shrink-0" />
              {vendor.phone}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
