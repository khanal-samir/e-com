"use client";

import { useEffect, useRef } from "react";

/** Redirects the browser to Khalti's hosted payment page. */
export function KhaltiRedirect({ url }: { url: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    window.location.assign(url);
  }, [url]);

  return (
    <div className="py-16 text-center">
      <p className="font-medium">Redirecting to Khalti…</p>
      <p className="mt-1 text-sm text-muted-foreground">Do not refresh or close this page.</p>
    </div>
  );
}
