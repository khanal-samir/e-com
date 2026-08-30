import { ImageKitProvider, Image as IkImage } from "@imagekit/next";
import { cn } from "@/lib/utils";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";

/**
 * Renders ImageKit-hosted images through the ImageKit loader (on-the-fly
 * transformations) and falls back to a plain <img> for local/seeded files.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 25vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const fallback = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/placeholder.svg" alt={alt} className={cn("h-full w-full object-cover", className)} loading="lazy" />
  );

  if (!src) return fallback;

  // ImageKit absolute URL → rewrite to path so transformations apply
  let ikSrc: string | null = null;
  const match = src.match(/^https:\/\/ik\.imagekit\.io\/[^/]+(\/.*)$/);
  if (match) ikSrc = match[1];
  else if (src.startsWith("/") && !src.startsWith("/seed/") && urlEndpoint) ikSrc = src;

  if (!ikSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} loading="lazy" />;
  }

  if (!urlEndpoint) return fallback;

  return (
    <ImageKitProvider urlEndpoint={urlEndpoint}>
      <IkImage
        src={ikSrc}
        alt={alt}
        width={800}
        height={600}
        className={cn("h-full w-full object-cover", className)}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        transformation={[{ width: "800" }]}
      />
    </ImageKitProvider>
  );
}
