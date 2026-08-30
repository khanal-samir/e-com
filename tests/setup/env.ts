/**
 * Environment for integration tests. Must run BEFORE any module that imports
 * the database client — listed first in the integration project's setupFiles.
 */
process.env.BETTER_AUTH_SECRET ??= "test-secret-do-not-use-in-production";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.ESEWA_PRODUCT_CODE ??= "EPAYTEST";
process.env.ESEWA_SECRET_KEY ??= "8gBm/:&EnhH.1/q";
process.env.ESEWA_PAYMENT_URL ??= "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
process.env.ESEWA_STATUS_URL ??= "https://uat.esewa.com.np/api/epay/transaction/status/";
// Khalti: HTTP layer is mocked in tests, the key value itself is irrelevant
process.env.KHALTI_BASE_URL ??= "https://dev.khalti.com";
process.env.KHALTI_SECRET_KEY ??= "live_secret_test_key";

if (process.env.TEST_DATABASE_URL) {
  // remember the operator-supplied DATABASE_URL for the safety guard, then
  // point integration code paths at the testing database only
  process.env.RAW_DATABASE_URL = process.env.DATABASE_URL ?? "";
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
