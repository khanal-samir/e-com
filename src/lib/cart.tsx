"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import {
  addToServerCart,
  clearServerCart,
  mergeLocalCart,
  removeFromServerCart,
  setServerCartQuantity,
  type ServerCartItem,
} from "@/actions/cart";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ss-tech-cart-v1";
const MAX_QTY = 10;

function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const toCartItems = (rows: ServerCartItem[]): CartItem[] =>
  rows.map((r) => ({
    productId: r.productId,
    slug: r.slug,
    name: r.name,
    brandName: r.brandName,
    price: r.price,
    stock: r.stock,
    imageUrl: r.imageUrl,
    quantity: r.quantity,
  }));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const sessionState = authClient.useSession();
  const session = sessionState.data;
  const sessionLoading = sessionState.isPending;
  const userId = session?.user?.id ?? null;
  const syncedUserId = useRef<string | null>(null);

  // guests: hydrate from localStorage once
  useEffect(() => {
    if (sessionLoading || userId) return;
    if (syncedUserId.current === "guest") return;
    syncedUserId.current = "guest";
    setItems(readLocalCart());
    setReady(true);
  }, [sessionLoading, userId]);

  // guests: keep localStorage in sync with item changes
  useEffect(() => {
    if (sessionLoading || userId || !ready) return;
    writeLocalCart(items);
  }, [items, ready, sessionLoading, userId]);

  // signed in: merge the local cart into the account cart once per login,
  // then the server cart is the single source of truth
  useEffect(() => {
    if (sessionLoading || !userId) return;
    if (syncedUserId.current === userId) return;
    syncedUserId.current = userId;
    const local = readLocalCart();
    const payload = local.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    mergeLocalCart(payload)
      .then((rows) => {
        setItems(rows ? toCartItems(rows) : []);
        writeLocalCart([]); // local cart now lives on the account
        setReady(true);
      })
      .catch(() => {
        setItems([]);
        setReady(true);
      });
  }, [sessionLoading, userId]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      const clamped = Math.max(1, Math.min(quantity, MAX_QTY, item.stock));
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, ...item, quantity: Math.min(i.quantity + clamped, MAX_QTY, item.stock) }
              : i,
          );
        }
        return [...prev, { ...item, quantity: clamped }];
      });
      if (userId) {
        addToServerCart(item.productId, clamped)
          .then((rows) => rows && setItems(toCartItems(rows)))
          .catch(() => {});
      }
    },
    [userId],
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      if (userId) {
        removeFromServerCart(productId)
          .then((rows) => rows && setItems(toCartItems(rows)))
          .catch(() => {});
      }
    },
    [userId],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => i.productId !== productId)
          : prev.map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(quantity, MAX_QTY, i.stock) }
                : i,
            ),
      );
      if (userId) {
        setServerCartQuantity(productId, quantity)
          .then((rows) => rows && setItems(toCartItems(rows)))
          .catch(() => {});
      }
    },
    [userId],
  );

  const clear = useCallback(() => {
    setItems([]);
    if (userId) {
      clearServerCart().catch(() => {});
    } else {
      localStorage.removeItem(STORAGE_KEY);
      writeLocalCart([]);
    }
  }, [userId]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, count, subtotal, ready, addItem, removeItem, setQuantity, clear };
  }, [items, ready, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
