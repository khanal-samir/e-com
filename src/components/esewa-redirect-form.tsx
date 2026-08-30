"use client";

import { useEffect, useRef } from "react";

export interface EsewaRedirect {
  url: string;
  fields: Record<string, string>;
}

/**
 * Renders the signed eSewa form payload and auto-submits it. The browser
 * posts directly to eSewa; our server signature stays intact.
 */
export function EsewaRedirectForm({ esewa }: { esewa: EsewaRedirect }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.submit();
  }, [esewa]);

  return (
    <div className="py-16 text-center">
      <p className="font-medium">Redirecting to eSewa…</p>
      <p className="mt-1 text-sm text-muted-foreground">Do not refresh or close this page.</p>
      <form ref={formRef} method="POST" action={esewa.url}>
        {Object.entries(esewa.fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>
    </div>
  );
}
