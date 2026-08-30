import { afterAll } from "vitest";
import { guardFixtures, cleanupRun } from "../fixtures/database";

/**
 * Integration test database wiring. Requires explicit opt-in and a dedicated
 * Neon testing database (see tests/setup/env.ts, which must run first).
 */
guardFixtures();

afterAll(async () => {
  await cleanupRun();
});
