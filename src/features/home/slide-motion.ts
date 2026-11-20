/**
 * A hero slide's copy rises in each time the slide becomes active. Keyed on the
 * slide frame's `data-active` (HeroCarousel), so it replays when the carousel
 * loops back. The hidden state is `motion-safe:` only — with reduced motion the
 * copy is simply there.
 *
 * Lives outside HeroCarousel on purpose: that file is `"use client"`, and a
 * server component importing a plain value from it gets a client reference,
 * not the string.
 */
export const SLIDE_ENTER =
  "motion-safe:opacity-0 motion-safe:group-data-[active=true]/slide:animate-rise-in";
