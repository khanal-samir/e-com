/** Pure pricing constants shared by client and server (no DB imports). */
export const ORDER_EXPIRY_MINUTES = 30;
/**
 * Amount actually charged at the gateway when PAYMENT_TEST_MODE=1 (sandbox
 * wallets hold only a few rupees). The order keeps its real total; only the
 * gateway charge is this constant.
 */
export const TEST_PAYMENT_AMOUNT_NPR = 10;
export const DELIVERY_CHARGE = 500;
export const FREE_DELIVERY_THRESHOLD = 100_000;

export function deliveryChargeFor(subtotal: number) {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
}
