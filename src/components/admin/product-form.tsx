"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { createProduct, updateProduct, type ActionState } from "@/actions/products";
import type { Brand, Product, ProductImage } from "@/db/schema";

interface ProductFormProps {
  brands: Brand[];
  product?: (Product & { images: ProductImage[] }) | null;
}

export function ProductForm({ brands, product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [state, action, isPending] = useActionState<ActionState, FormData>(isEdit ? updateProduct : createProduct, {});
  const [images, setImages] = useState<UploadedImage[]>(
    (product?.images ?? []).map((i) => ({ imagekitFileId: i.imagekitFileId, path: i.path, url: i.url, alt: i.alt })),
  );
  const [status, setStatus] = useState<string>(product?.status ?? "draft");

  useEffect(() => {
    if (state.ok) router.push("/admin/products");
  }, [state.ok, router]);

  if (state.ok) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Saved — redirecting…</p>;
  }

  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={action} className="space-y-8">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {state.error && !state.fieldErrors && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 font-semibold">Basic information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" name="name" required defaultValue={product?.name} aria-invalid={!!fieldError("name")} />
            {fieldError("name") && <p className="text-xs text-destructive">{fieldError("name")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brandId">Brand</Label>
            <Select name="brandId" required defaultValue={product?.brandId}>
              <SelectTrigger id="brandId" aria-invalid={!!fieldError("brandId")}>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("brandId") && <p className="text-xs text-destructive">{fieldError("brandId")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" required defaultValue={product?.sku} aria-invalid={!!fieldError("sku")} />
            {fieldError("sku") && <p className="text-xs text-destructive">{fieldError("sku")}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Input id="shortDescription" name="shortDescription" maxLength={300} defaultValue={product?.shortDescription ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Full description</Label>
            <Textarea id="description" name="description" rows={5} maxLength={5000} defaultValue={product?.description ?? ""} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 font-semibold">Pricing &amp; inventory</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (NPR)</Label>
            <Input id="price" name="price" type="number" min={1} required defaultValue={product?.price} aria-invalid={!!fieldError("price")} />
            {fieldError("price") && <p className="text-xs text-destructive">{fieldError("price")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compareAtPrice">Compare-at price (optional)</Label>
            <Input id="compareAtPrice" name="compareAtPrice" type="number" min={0} defaultValue={product?.compareAtPrice ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" name="stock" type="number" min={0} required defaultValue={product?.stock ?? 0} aria-invalid={!!fieldError("stock")} />
            {fieldError("stock") && <p className="text-xs text-destructive">{fieldError("stock")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select name="status" value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm font-medium">
            <Checkbox name="featured" defaultChecked={product?.featured} />
            Featured on homepage
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 font-semibold">Specifications</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <SpecField label="Processor" name="processor" value={product?.processor} />
          <SpecField label="Processor brand" name="processorBrand" value={product?.processorBrand} />
          <SpecField label="Graphics" name="graphics" value={product?.graphics} />
          <SpecField label="RAM (GB)" name="ramGb" type="number" value={product?.ramGb} />
          <SpecField label="Storage (GB)" name="storageGb" type="number" value={product?.storageGb} />
          <SpecField label="Storage type" name="storageType" value={product?.storageType} placeholder="SSD / HDD" />
          <SpecField label="Screen size" name="screenSize" value={product?.screenSize} placeholder='14"' />
          <SpecField label="Refresh rate" name="refreshRate" value={product?.refreshRate} placeholder="60Hz" />
          <SpecField label="Operating system" name="operatingSystem" value={product?.operatingSystem} />
          <SpecField label="Warranty" name="warranty" value={product?.warranty} placeholder="1 year" />
        </div>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 font-semibold">Images</h2>
        <ImageUploader images={images} onChange={setImages} />
        {fieldError("images") && <p className="mt-2 text-xs text-destructive">{fieldError("images")}</p>}
      </section>

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SpecField({
  label,
  name,
  value,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} defaultValue={value ?? ""} />
    </div>
  );
}
