import type { CartItem, FoodItem } from "../types";

export function getSubtotal(items: Pick<CartItem, "price" | "quantity">[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function getDeliveryFee(items: CartItem[]): number {
  const feesByRestaurant = new Map(items.map((item) => [item.restaurantId, item.deliveryFee]));
  return [...feesByRestaurant.values()].reduce((total, fee) => total + fee, 0);
}

export function getPromoDiscount(items: CartItem[], code: string): number {
  return code.trim().toUpperCase() === "FIRSTBITE" ? Math.min(150, getSubtotal(items)) : 0;
}

export function getTotal(items: CartItem[], discount = 0): number {
  return getSubtotal(items) + getDeliveryFee(items) - discount;
}

export function addToCart(items: CartItem[], food: FoodItem): CartItem[] {
  const existing = items.find((item) => item.id === food.id);
  if (existing) {
    return items.map((item) =>
      item.id === food.id ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }
  return [...items, { ...food, quantity: 1 }];
}

export function changeQuantity(items: CartItem[], id: string, delta: number): CartItem[] {
  return items
    .map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + delta } : item,
    )
    .filter((item) => item.quantity > 0);
}
