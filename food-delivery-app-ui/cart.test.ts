import { describe, expect, it } from "vitest";
import { foodItems } from "../src/data/mockData";
import { addToCart, changeQuantity, getDeliveryFee, getPromoDiscount, getSubtotal, getTotal } from "../src/lib/cart";
import type { CartItem } from "../src/types";

describe("cart calculations", () => {
  it("calculates subtotal, delivery and total for quantities", () => {
    const items: CartItem[] = [
      { ...foodItems[0], quantity: 2 },
      { ...foodItems[1], quantity: 1 },
    ];
    expect(getSubtotal(items)).toBe(947);
    expect(getDeliveryFee(items)).toBe(25);
    expect(getTotal(items)).toBe(972);
  });

  it("charges delivery once per restaurant represented in the cart", () => {
    const items = [
      { ...foodItems[0], quantity: 1 },
      { ...foodItems[4], quantity: 1 },
    ];
    expect(getDeliveryFee(items)).toBe(55);
  });

  it("increments existing items and adds new items", () => {
    const one = addToCart([], foodItems[0]);
    expect(addToCart(one, foodItems[0])[0].quantity).toBe(2);
    expect(addToCart(one, foodItems[1])).toHaveLength(2);
  });

  it("removes an item when its quantity reaches zero", () => {
    const items = addToCart([], foodItems[0]);
    expect(changeQuantity(items, foodItems[0].id, -1)).toEqual([]);
    expect(getDeliveryFee([])).toBe(0);
  });

  it("caps the FIRSTBITE discount at ₹150 and never discounts an empty cart", () => {
    const items = addToCart([], foodItems[0]);
    const discount = getPromoDiscount(items, "firstbite");
    expect(discount).toBe(150);
    expect(getTotal(items, discount)).toBe(204);
    expect(getPromoDiscount(items, "NOTREAL")).toBe(0);
    expect(getPromoDiscount([], "FIRSTBITE")).toBe(0);
  });
});
