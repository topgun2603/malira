"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { FadeIn } from "@/components/motion/primitives";
import { useLanguage } from "@/components/reader/language";
import { useVendor } from "@/hooks/use-vendors";
import {
  VENDOR_CATEGORY_LABELS,
  VENDOR_CATEGORY_LABELS_TA,
  isVendorLive,
} from "@/lib/types";

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const { data: vendor, isLoading } = useVendor(params.id);
  const [shown, setShown] = useState(0);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  // A listing that is not live reads as missing rather than as hidden. Saying
  // "this is unpaid" to a passer-by would expose the vendor's billing state to
  // anybody who kept an old link.
  if (!vendor || !isVendorLive(vendor)) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Store}
          title={ta ? "இது இப்போது இல்லை" : "Not available"}
          description={
            ta
              ? "இந்த நிறுவனம் தற்போது பட்டியலில் இல்லை."
              : "This business is not in the directory at the moment."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/services">
                {ta ? "அனைத்து சேவைகள்" : "All services"}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const photos = vendor.photos;
  const details = Object.entries(vendor.details ?? {}).filter(([, v]) => v);

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link href="/services">
          <ArrowLeft className="size-4" />
          {ta ? "அனைத்து சேவைகள்" : "All services"}
        </Link>
      </Button>

      <FadeIn className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="bg-muted aspect-[4/3] overflow-hidden rounded-xl">
            {photos[shown] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[shown].url}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center">
                <Store className="size-10" />
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, index) => (
                <button
                  key={photo.url}
                  type="button"
                  onClick={() => setShown(index)}
                  className={
                    index === shown
                      ? "ring-primary size-16 shrink-0 overflow-hidden rounded-md ring-2"
                      : "size-16 shrink-0 overflow-hidden rounded-md opacity-70"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {vendor.name}
              </h1>
              {vendor.featured && (
                <Badge className="gap-1">
                  <Star className="size-3" />
                  {ta ? "சிறப்பு" : "Featured"}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="font-normal">
              {ta
                ? VENDOR_CATEGORY_LABELS_TA[vendor.category]
                : VENDOR_CATEGORY_LABELS[vendor.category]}
            </Badge>
          </div>

          {(ta && vendor.aboutTa ? vendor.aboutTa : vendor.about) && (
            <p className="leading-relaxed whitespace-pre-wrap">
              {ta && vendor.aboutTa ? vendor.aboutTa : vendor.about}
            </p>
          )}

          {details.length > 0 && (
            <>
              <Separator />
              <dl className="grid gap-2 sm:grid-cols-2">
                {details.map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              {vendor.capacity > 0 && (
                <p className="flex items-center gap-2 text-sm">
                  <Users className="text-primary size-4" />
                  {ta ? `${vendor.capacity} பேர்` : `Seats ${vendor.capacity}`}
                </p>
              )}
              {vendor.priceFromInPaise > 0 && (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {ta ? "தொடக்க விலை" : "From"}{" "}
                  </span>
                  <span className="font-medium">
                    {rupees(vendor.priceFromInPaise)}
                  </span>
                </p>
              )}
              {(vendor.address || vendor.town) && (
                <p className="text-muted-foreground flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {vendor.address}
                    {vendor.address && vendor.town ? ", " : ""}
                    {vendor.town}
                  </span>
                </p>
              )}

              <Separator />

              {/*
                The phone is the point of a directory. It is shown outright, not
                behind a sign-in: this is a business that is paying to be
                reachable, which is the opposite of a matrimony listing.
              */}
              {vendor.phone && (
                <Button className="w-full" asChild>
                  <a href={`tel:${vendor.phone}`}>
                    <Phone className="size-4" />
                    {vendor.phone}
                  </a>
                </Button>
              )}
              {vendor.whatsapp && (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`https://wa.me/${vendor.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {vendor.mapUrl && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={vendor.mapUrl} target="_blank" rel="noreferrer">
                    <MapPin className="size-4" />
                    {ta ? "வரைபடம்" : "Map"}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {ta
              ? "இந்தப் பட்டியல் பரிசீலிக்கப்பட்டது. விலை மற்றும் கிடைக்கும் தன்மையை நேரடியாக உறுதி செய்யுங்கள்."
              : "This listing was reviewed before it appeared. Confirm price and availability with the business directly."}
          </p>
        </aside>
      </FadeIn>
    </article>
  );
}
