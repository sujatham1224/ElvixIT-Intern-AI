export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  cuisines: string[];
  rating: number;
  deliveryMinutes: number;
  deliveryFee: number;
  offer: string;
  image: string;
  cover: string;
  vegetarian: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  restaurantId: string;
  deliveryFee: number;
  image: string;
  vegetarian: boolean;
  category: string;
}

export interface CartItem extends FoodItem {
  quantity: number;
}

export interface DemoOrder {
  reference: string;
  placedAt: string;
  customerName: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  deliveryInstructions: string;
}

export type SortOption = "recommended" | "rating" | "delivery";
