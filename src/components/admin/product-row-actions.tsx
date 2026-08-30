"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { setProductStatus, deleteProduct } from "@/actions/products";

export function ProductRowActions({ productId, status }: { productId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const changeStatus = (next: "draft" | "active" | "archived") => {
    startTransition(async () => {
      const res = await setProductStatus(productId, next);
      if (res.ok) {
        toast.success(next === "active" ? "Product published" : next === "draft" ? "Moved to draft" : "Product archived");
        router.refresh();
      } else toast.error(res.error ?? "Failed");
    });
  };

  return (
    <div className="flex items-center gap-1">
      {status !== "active" ? (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => changeStatus("active")}>
          Publish
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => changeStatus("archived")}>
          Archive
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={isPending}>
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product and its ImageKit images. Past orders keep their item snapshots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep product</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                const res = await deleteProduct(productId);
                if (res.ok) {
                  toast.success("Product deleted");
                  router.refresh();
                } else toast.error(res.error ?? "Failed to delete");
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
