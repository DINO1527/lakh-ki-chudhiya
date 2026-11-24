"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  hydrateCustomerCart,
  mergeCartItems,
  normalizeCartItems,
  replaceCartItem,
  type CartItem,
} from "../domain/cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  hydrated: boolean;
  syncState: "idle" | "saving" | "saved" | "error";
  addItem: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  replaceItem: (currentVariantId: string, nextVariantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
  customerId: string | null;
  initialItems: readonly CartItem[];
};

export function CartProvider({ children, customerId, initialItems }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([...initialItems]);
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<CartContextValue["syncState"]>("idle");
  const storageKey = customerId ? `${CART_STORAGE_KEY}:${customerId}` : `${CART_STORAGE_KEY}:guest`;
  const pendingSyncStorageKey = customerId ? `${storageKey}:pending` : null;
  const initialItemsKey = JSON.stringify(initialItems);

  useEffect(() => {
    let accountItems: CartItem[] = [];
    let guestItems: CartItem[] = [];
    let accountItemsExist = false;
    let hasUnsyncedAccountChanges = false;
    try {
      const accountItemsJson = localStorage.getItem(storageKey);
      accountItemsExist = accountItemsJson !== null;
      accountItems = normalizeCartItems(JSON.parse(accountItemsJson ?? "[]"));
      if (customerId) {
        hasUnsyncedAccountChanges =
          accountItemsExist &&
          pendingSyncStorageKey !== null &&
          localStorage.getItem(pendingSyncStorageKey) === "1";
        guestItems = normalizeCartItems(
          JSON.parse(localStorage.getItem(`${CART_STORAGE_KEY}:guest`) ?? "[]"),
        );
      }
    } catch {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${CART_STORAGE_KEY}:guest`);
      if (pendingSyncStorageKey) localStorage.removeItem(pendingSyncStorageKey);
    }

    const serverItems = normalizeCartItems(JSON.parse(initialItemsKey));
    const frame = window.requestAnimationFrame(() => {
      setItems(
        customerId
          ? hydrateCustomerCart(serverItems, accountItems, guestItems, hasUnsyncedAccountChanges)
          : guestItems.length > 0
            ? guestItems
            : accountItems,
      );
      if (customerId && guestItems.length > 0 && pendingSyncStorageKey) {
        localStorage.setItem(pendingSyncStorageKey, "1");
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customerId, initialItemsKey, pendingSyncStorageKey, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
    if (!customerId) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSyncState("saving");
      void fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Cart sync failed");
          localStorage.removeItem(`${CART_STORAGE_KEY}:guest`);
          if (pendingSyncStorageKey) localStorage.removeItem(pendingSyncStorageKey);
          setSyncState("saved");
        })
        .catch(() => {
          if (!controller.signal.aborted) setSyncState("error");
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [customerId, hydrated, items, pendingSyncStorageKey, storageKey]);

  const markAccountCartPending = useCallback(() => {
    if (pendingSyncStorageKey) localStorage.setItem(pendingSyncStorageKey, "1");
  }, [pendingSyncStorageKey]);

  const invalidateCheckoutKey = useCallback(() => {
    sessionStorage.removeItem("lakh-checkout-idempotency-v1");
  }, []);

  const addItem = useCallback(
    (variantId: string, quantity = 1) => {
      invalidateCheckoutKey();
      markAccountCartPending();
      setItems((current) => mergeCartItems(current, [{ variantId, quantity }]));
    },
    [invalidateCheckoutKey, markAccountCartPending],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      invalidateCheckoutKey();
      markAccountCartPending();
      setItems((current) =>
        quantity < 1
          ? current.filter((item) => item.variantId !== variantId)
          : normalizeCartItems(
              current.map((item) => (item.variantId === variantId ? { ...item, quantity } : item)),
            ),
      );
    },
    [invalidateCheckoutKey, markAccountCartPending],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      invalidateCheckoutKey();
      markAccountCartPending();
      setItems((current) => current.filter((item) => item.variantId !== variantId));
    },
    [invalidateCheckoutKey, markAccountCartPending],
  );

  const replaceItem = useCallback(
    (currentVariantId: string, nextVariantId: string, quantity: number) => {
      invalidateCheckoutKey();
      markAccountCartPending();
      setItems((current) => replaceCartItem(current, currentVariantId, nextVariantId, quantity));
    },
    [invalidateCheckoutKey, markAccountCartPending],
  );

  const clearCart = useCallback(() => {
    invalidateCheckoutKey();
    markAccountCartPending();
    setItems([]);
  }, [invalidateCheckoutKey, markAccountCartPending]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      hydrated,
      syncState,
      addItem,
      setQuantity,
      replaceItem,
      removeItem,
      clearCart,
    }),
    [items, hydrated, syncState, addItem, setQuantity, replaceItem, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}
