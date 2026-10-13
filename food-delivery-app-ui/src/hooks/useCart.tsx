import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { CartItem, FoodItem } from "../types";
import { addToCart, changeQuantity, getDeliveryFee, getPromoDiscount, getSubtotal, getTotal } from "../lib/cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode: string;
  add: (item: FoodItem) => void;
  updateQuantity: (id: string, delta: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "quickbite-cart";
const PROMO_KEY = "quickbite-promo";

function readCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "quantity" in item &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [promoCode, setPromoCode] = useState(() => localStorage.getItem(PROMO_KEY) ?? "");
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    if (items.length && promoCode) localStorage.setItem(PROMO_KEY, promoCode);
    else localStorage.removeItem(PROMO_KEY);
  }, [items.length, promoCode]);
  useEffect(() => {
    if (!items.length && promoCode) setPromoCode("");
  }, [items.length, promoCode]);

  const add = useCallback((item: FoodItem) => setItems((current) => addToCart(current, item)), []);
  const updateQuantity = useCallback(
    (id: string, delta: number) => setItems((current) => changeQuantity(current, id, delta)),
    [],
  );
  const remove = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => { setItems([]); setPromoCode(""); }, []);
  const applyPromo = useCallback((code: string) => {
    if (code.trim().toUpperCase() !== "FIRSTBITE" || !items.length) return false;
    setPromoCode("FIRSTBITE");
    return true;
  }, [items.length]);
  const clearPromo = useCallback(() => setPromoCode(""), []);
  const discount = getPromoDiscount(items, promoCode);
  const value = useMemo(
    () => ({
      items,
      count: items.reduce((count, item) => count + item.quantity, 0),
      subtotal: getSubtotal(items),
      deliveryFee: getDeliveryFee(items),
      discount,
      total: getTotal(items, discount),
      promoCode,
      add,
      updateQuantity,
      remove,
      clear,
      applyPromo,
      clearPromo,
    }),
    [items, discount, promoCode, add, updateQuantity, remove, clear, applyPromo, clearPromo],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
