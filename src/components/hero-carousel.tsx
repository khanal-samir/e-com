"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal auto-advancing hero carousel (Embla — same primitive shadcn's
 * carousel wraps). Pauses on hover/focus, respects prefers-reduced-motion.
 */
export function HeroCarousel({ slides }: { slides: React.ReactNode[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const pausedRef = useRef(false);
  const slidesInView = slides.length;

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    const t = setTimeout(onSelect, 0); // initial sync without sync setState
    return () => {
      emblaApi.off("select", onSelect);
      clearTimeout(t);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || slidesInView < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = setInterval(() => {
      if (!pausedRef.current) emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(id);
  }, [emblaApi, slidesInView]);

  return (
    <section
      className="relative overflow-hidden rounded-xl border"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocus={() => (pausedRef.current = true)}
      onBlur={() => (pausedRef.current = false)}
      aria-roledescription="carousel"
      aria-label="Featured promotions"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
              {slide}
            </div>
          ))}
        </div>
      </div>

      {slidesInView > 1 && (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous slide"
            className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 shadow-sm transition-colors hover:bg-accent"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next slide"
            className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 shadow-sm transition-colors hover:bg-accent"
          >
            <ChevronRightIcon className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={selected === i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  selected === i ? "w-6 bg-primary" : "w-1.5 bg-foreground/25 hover:bg-foreground/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
