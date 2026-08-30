ALTER TYPE "public"."payment_provider" ADD VALUE 'khalti';--> statement-breakpoint
ALTER TYPE "public"."payment_provider" ADD VALUE 'cod';--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "pidx" text;