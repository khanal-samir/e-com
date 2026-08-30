import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom tests render Next components outside the app router
vi.mock("next/navigation", () => {
  const push = vi.fn();
  const refresh = vi.fn();
  return {
    useRouter: () => ({ push, refresh, replace: vi.fn(), back: vi.fn() }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(window.location.search),
    redirect: (url: string) => {
      throw new Error(`redirect: ${url}`);
    },
  };
});

afterEach(() => cleanup());
