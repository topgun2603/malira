"use client";

import { useState } from "react";
import { format } from "date-fns";
import { IndianRupee, Loader2, Plus, Save, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/states";
import { SignInGate } from "@/components/matrimony/sign-in-gate";
import { MatrimonyPhotos } from "@/components/matrimony/photo-uploader";
import { MyPayments } from "@/components/payments/my-payments";
import { PayDialog } from "@/components/payments/pay-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/reader/language";
import { useActivePlans } from "@/hooks/use-plans";
import {
  useCreateVendor,
  useOwnVendors,
  useSaveVendor,
  useSetVendorOwnStatus,
} from "@/hooks/use-vendors";
import { EMPTY_VENDOR_DRAFT, type VendorDraft } from "@/lib/api/vendors";
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_LABELS,
  isVendorLive,
  type ArticleImage,
  type Vendor,
  type VendorCategory,
} from "@/lib/types";

/**
 * A business managing its own listings.
 *
 * Several per account on purpose: one family often runs the hall and the buses,
 * and making them sign in twice to say so would be a rule the software imposed
 * on a household rather than one the household recognised.
 */
export default function MyServicesPage() {
  return (
    <SignInGate>
      <MyServices />
    </SignInGate>
  );
}

function MyServices() {
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const { data: vendors, isLoading } = useOwnVendors();
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (editing) {
    return (
      <VendorForm
        vendor={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ta ? "என் நிறுவனங்கள்" : "My businesses"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {ta
              ? "பரிசீலனைக்குப் பிறகு, கட்டணம் செலுத்தியதும் பட்டியலில் தோன்றும்."
              : "A listing appears once it is approved and paid for."}
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          {ta ? "புதிது" : "Add one"}
        </Button>
      </header>

      {!vendors?.length ? (
        <EmptyState
          icon={Store}
          title={ta ? "இன்னும் எதுவும் இல்லை" : "Nothing listed yet"}
          description={
            ta
              ? "மண்டபம், சமையல், புகைப்படம், அலங்காரம், வாகனம் அல்லது இசை."
              : "Halls, catering, photography, decoration, transport or music."
          }
        />
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              onEdit={() => setEditing(vendor)}
            />
          ))}
        </div>
      )}

      <MyPayments />
    </div>
  );
}

function VendorRow({
  vendor,
  onEdit,
}: {
  vendor: Vendor;
  onEdit: () => void;
}) {
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const setStatus = useSetVendorOwnStatus();
  const { data: plans } = useActivePlans("vendor");
  const [paying, setPaying] = useState(false);

  const live = isVendorLive(vendor);
  const plan = plans?.[0] ?? null;
  const needsPayment = vendor.status === "approved" && !live;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{vendor.name || "Untitled"}</p>
            <p className="text-muted-foreground text-sm">
              {VENDOR_CATEGORY_LABELS[vendor.category]}
              {vendor.town ? ` · ${vendor.town}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={vendor.status === "approved" ? "default" : "secondary"}
              className="font-normal"
            >
              {VENDOR_STATUS_LABELS[vendor.status]}
            </Badge>
            {/*
              Approved and live are not the same, and a vendor who cannot tell
              them apart will ring the desk to ask why nothing has appeared.
            */}
            {vendor.status === "approved" && (
              <Badge
                variant={live ? "default" : "destructive"}
                className="font-normal"
              >
                {live
                  ? ta
                    ? "பட்டியலில் உள்ளது"
                    : "In the directory"
                  : ta
                    ? "கட்டணம் நிலுவை"
                    : "Not paid"}
              </Badge>
            )}
          </div>
        </div>

        {vendor.reviewNote && (
          <p className="bg-muted/60 rounded-md p-2 text-xs">
            {vendor.reviewNote}
          </p>
        )}

        {vendor.paidUntil && (
          <p className="text-muted-foreground text-xs">
            {ta ? "செல்லுபடி" : "Paid until"}{" "}
            {format(vendor.paidUntil.toDate(), "d MMM yyyy")}
          </p>
        )}

        {needsPayment && (
          <Alert>
            <IndianRupee className="size-4" />
            <AlertTitle>
              {ta ? "கட்டணம் செலுத்தவும்" : "One step left"}
            </AlertTitle>
            <AlertDescription>
              {ta
                ? "பரிசீலனை முடிந்தது. கட்டணம் செலுத்தியதும் பட்டியலில் தோன்றும்."
                : "It has been approved. It appears in the directory once it is paid for."}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            {ta ? "திருத்து" : "Edit"}
          </Button>
          {vendor.status !== "paused" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setStatus.mutate({ id: vendor.id, status: "paused" })
              }
            >
              {ta ? "இடைநிறுத்து" : "Pause"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setStatus.mutate({ id: vendor.id, status: "pending" })
              }
            >
              {ta ? "மீண்டும் தொடங்கு" : "Resume"}
            </Button>
          )}
          {plan && (
            <Button size="sm" onClick={() => setPaying(true)}>
              <IndianRupee className="size-4" />
              {live
                ? ta
                  ? "நீட்டி"
                  : "Extend"
                : ta
                  ? "கட்டணம்"
                  : "Pay"}
            </Button>
          )}
        </div>

        <PayDialog
          open={paying}
          onOpenChange={setPaying}
          plan={plan}
          purpose="vendor"
          vendorId={vendor.id}
          vendorName={vendor.name}
          vendorCategory={vendor.category}
        />
      </CardContent>
    </Card>
  );
}

function VendorForm({
  vendor,
  onClose,
}: {
  vendor: Vendor | null;
  onClose: () => void;
}) {
  const { firebaseUser } = useAuth();
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const create = useCreateVendor();
  const save = useSaveVendor();

  const [draft, setDraft] = useState<VendorDraft>(() =>
    vendor
      ? {
          category: vendor.category,
          name: vendor.name,
          about: vendor.about,
          aboutTa: vendor.aboutTa,
          town: vendor.town,
          address: vendor.address,
          mapUrl: vendor.mapUrl,
          phone: vendor.phone,
          whatsapp: vendor.whatsapp,
          email: vendor.email,
          photos: vendor.photos,
          capacity: vendor.capacity,
          priceFromInPaise: vendor.priceFromInPaise,
          details: vendor.details,
        }
      : EMPTY_VENDOR_DRAFT,
  );

  function set<K extends keyof VendorDraft>(key: K, value: VendorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const busy = create.isPending || save.isPending;
  const ready = draft.name.trim() && draft.phone.trim() && draft.town.trim();

  function submit() {
    const done = { onSuccess: () => onClose() };
    if (vendor) save.mutate({ id: vendor.id, draft }, done);
    else create.mutate(draft, done);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {vendor
          ? ta
            ? "திருத்து"
            : "Edit listing"
          : ta
            ? "புதிய பதிவு"
            : "New listing"}
      </h1>

      {vendor && (
        <Alert>
          <AlertTitle>{ta ? "மீண்டும் பரிசீலனை" : "This goes back for review"}</AlertTitle>
          <AlertDescription>
            {ta
              ? "திருத்திய பிறகு மீண்டும் பரிசீலிக்கப்படும். செலுத்திய கட்டணம் பாதிக்கப்படாது."
              : "An edited listing is read again before it reappears. The time you have paid for is not affected."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{ta ? "விவரங்கள்" : "The business"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">{ta ? "வகை" : "Category"}</Label>
            <Select
              value={draft.category}
              onValueChange={(v) => set("category", v as VendorCategory)}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {VENDOR_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{ta ? "பெயர்" : "Name"}</Label>
            <Input
              id="name"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="about">{ta ? "விவரம்" : "About"}</Label>
            <Textarea
              id="about"
              rows={4}
              value={draft.about}
              onChange={(event) => set("about", event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="aboutTa">{ta ? "தமிழில் விவரம்" : "About, in Tamil"}</Label>
            <Textarea
              id="aboutTa"
              rows={3}
              value={draft.aboutTa}
              onChange={(event) => set("aboutTa", event.target.value)}
            />
          </div>

          {/* Only halls are asked for seats; it is meaningless elsewhere. */}
          {draft.category === "hall" && (
            <div className="space-y-2">
              <Label htmlFor="capacity">{ta ? "இருக்கைகள்" : "Seats"}</Label>
              <Input
                id="capacity"
                type="number"
                inputMode="numeric"
                value={draft.capacity || ""}
                onChange={(event) =>
                  set("capacity", Number(event.target.value) || 0)
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="price">
              {ta ? "தொடக்க விலை (₹)" : "From price (₹)"}
            </Label>
            <Input
              id="price"
              type="number"
              inputMode="numeric"
              value={draft.priceFromInPaise ? draft.priceFromInPaise / 100 : ""}
              placeholder={ta ? "விருப்பம்" : "Optional"}
              onChange={(event) =>
                set("priceFromInPaise", (Number(event.target.value) || 0) * 100)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ta ? "தொடர்பு" : "Contact and place"}</CardTitle>
          <CardDescription>
            {ta
              ? "இவை பொதுவில் தெரியும். இது ஒரு விளம்பரம்."
              : "These are shown publicly. This is an advertisement, not a private profile."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">{ta ? "தொலைபேசி" : "Phone"}</Label>
            <Input
              id="phone"
              value={draft.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={draft.whatsapp}
              onChange={(event) => set("whatsapp", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{ta ? "மின்னஞ்சல்" : "Email"}</Label>
            <Input
              id="email"
              value={draft.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="town">{ta ? "ஊர்" : "Town"}</Label>
            <Input
              id="town"
              value={draft.town}
              onChange={(event) => set("town", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">{ta ? "முகவரி" : "Address"}</Label>
            <Input
              id="address"
              value={draft.address}
              onChange={(event) => set("address", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="mapUrl">{ta ? "வரைபட இணைப்பு" : "Map link"}</Label>
            <Input
              id="mapUrl"
              value={draft.mapUrl}
              placeholder="https://maps.app.goo.gl/…"
              onChange={(event) => set("mapUrl", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ta ? "படங்கள்" : "Photographs"}</CardTitle>
        </CardHeader>
        <CardContent>
          <MatrimonyPhotos
            uid={firebaseUser?.uid ?? ""}
            destination="vendor"
            value={draft.photos}
            onChange={(photos: ArticleImage[]) => set("photos", photos)}
            disabled={busy}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || !ready}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {ta ? "அனுப்பு" : "Send for review"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {ta ? "ரத்து" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
