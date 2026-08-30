"use client";

import { useRef, useState } from "react";
import { upload } from "@imagekit/next";
import { ArrowDownIcon, ArrowUpIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getImageKitUploadParams } from "@/actions/imagekit";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  imagekitFileId?: string | null;
  path?: string | null;
  url: string;
  alt?: string | null;
}

const MAX_IMAGES = 8;
const MAX_SIZE_MB = 5;

export function ImageUploader({ images, onChange }: { images: UploadedImage[]; onChange: (images: UploadedImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images per product`);
      return;
    }
    setUploading(true);
    try {
      const auth = await getImageKitUploadParams();
      if (!auth.ok) {
        toast.error(auth.error);
        return;
      }
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`${file.name} exceeds ${MAX_SIZE_MB}MB`);
          continue;
        }
        const result = await upload({
          file,
          fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
          folder: "/ss-tech/products",
          ...auth.params,
        });
        uploaded.push({
          imagekitFileId: result.fileId ?? null,
          path: result.filePath ?? null,
          url: result.url ?? result.filePath ?? "",
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Check ImageKit configuration.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img, idx) => (
          <div key={`${img.url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt ?? `Image ${idx + 1}`} className="h-full w-full object-cover" />
            {idx === 0 && (
              <span className="absolute top-1 left-1 rounded bg-primary px-1 py-0.5 text-[10px] font-medium text-primary-foreground">Primary</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button type="button" variant="ghost" size="icon" className="size-6 text-white hover:bg-white/20 hover:text-white" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move image up">
                <ArrowUpIcon className="size-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6 text-white hover:bg-white/20 hover:text-white" onClick={() => move(idx, 1)} disabled={idx === images.length - 1} aria-label="Move image down">
                <ArrowDownIcon className="size-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6 text-white hover:bg-white/20 hover:text-white" onClick={() => remove(idx)} aria-label="Remove image">
                <Trash2Icon className="size-3" />
              </Button>
            </div>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary",
              uploading && "pointer-events-none opacity-60",
            )}
            aria-label="Upload images"
          >
            {uploading ? <Loader2Icon className="size-5 animate-spin" /> : <UploadIcon className="size-5" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <Label className="text-xs text-muted-foreground">
        Up to {MAX_IMAGES} images, max {MAX_SIZE_MB}MB each. First image is the primary thumbnail.
      </Label>
    </div>
  );
}
