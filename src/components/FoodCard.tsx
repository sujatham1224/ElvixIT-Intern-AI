import { Plus } from "lucide-react";
import type { FoodItem } from "../types";
import { formatPrice } from "../lib/format";

export function FoodCard({ item, onAdd }: { item: FoodItem; onAdd: (item: FoodItem) => void }) {
  return (
    <article className="food-card">
      <div className="food-image-wrap"><img className="food-image" src={item.image} alt={item.name} loading="lazy" /><span className={`diet-mark${item.vegetarian ? "" : " non-veg"}`} aria-label={item.vegetarian ? "Vegetarian" : "Non-vegetarian"} /></div>
      <div className="food-card-body"><h3>{item.name}</h3><p>{item.description}</p><div className="food-card-footer"><strong>{formatPrice(item.price)}</strong><button className="add-button" onClick={() => onAdd(item)} aria-label={`Add ${item.name} to cart`}><Plus size={15} /> Add</button></div></div>
    </article>
  );
}
