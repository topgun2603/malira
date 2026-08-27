# Matrimony images

Drop the generated files in this folder with these exact names. The page is
designed to look complete without them — each slot has a gradient underneath, so
a missing file degrades to a solid tinted panel rather than a broken image.

Palette to match: deep rose `#9c3464`, warm paper `#fdfcf8`, tea green `#1f6140`.

---

## 1. `hero.jpg` — 2400 × 1400 (landscape, ~16:9)

> A wide cinematic photograph of the Nilgiri hills in Tamil Nadu at golden hour:
> layered tea plantations receding into soft mist, rolling blue-green ridgelines,
> low warm sun raking across the slopes. Foreground slightly out of focus with a
> few wild rhododendron blooms in dusty rose. Warm, hopeful, unhurried. No people,
> no text, no logos. Rich but muted colour, gentle film grain, natural light,
> shot on medium format. Leave the left third visually calm and uncluttered for
> overlaid text.

**Important:** no people. The hero sits above a sign-up call to action, and a
photographed couple there reads as a testimonial for a match this service has
not made.

---

## 2. `tradition.jpg` — 1600 × 1200 (portrait-ish, 4:3)

> A quiet still-life detail photograph of traditional Nilgiri wedding textiles:
> folded handwoven white cotton cloth with a fine woven border, resting on dark
> wood, beside a small brass lamp and a few fresh jasmine flowers. Soft directional
> window light from the left, deep shadows, shallow depth of field. Reverent and
> understated, not staged or glossy. No faces, no hands, no text.

Used beside the "How it works" section as a calm counterweight.

---

## 3. `privacy.jpg` — 1600 × 1000 (landscape, 8:5) — optional

> An atmospheric abstract photograph: soft morning mist moving through tall
> eucalyptus trunks on a hillside, pale light, mostly negative space, cool
> desaturated greens and greys with a faint rose cast in the highlights. Calm,
> private, protective in mood. No people, no text.

Sits behind the privacy promise band. If you skip this one, that band falls back
to a flat tinted panel and still looks intentional.

---

## Format notes

- JPEG, quality ~80, under about 400 KB each. These are decorative; they should
  not be the heaviest thing on the page.
- If you generate WebP instead, keep the same base name and change the
  extension in `src/components/matrimony/landing.tsx` — the paths are in one
  place at the top of that file.
