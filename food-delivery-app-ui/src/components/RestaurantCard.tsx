import { Clock3, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Restaurant } from "../types";
import { formatPrice } from "../lib/format";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <article className="restaurant-card">
      <Link to={`/restaurants/${restaurant.id}`} className="restaurant-image-link" aria-label={`Open ${restaurant.name} menu`}>
        <img className="restaurant-image" src={restaurant.image} alt={`${restaurant.name} food`} loading="lazy" />
        <span className="offer-pill">{restaurant.offer}</span>
      </Link>
      <div className="restaurant-card-body">
        <div className="restaurant-card-heading"><h3>{restaurant.name}</h3><span className="rating"><Star size={13} fill="currentColor" />{restaurant.rating.toFixed(1)}</span></div>
        <p className="muted">{restaurant.cuisine}</p>
        <div className="card-meta"><span><Clock3 size={14} /> {restaurant.deliveryMinutes}–{restaurant.deliveryMinutes + 10} min</span><span>Delivery <strong>{restaurant.deliveryFee ? formatPrice(restaurant.deliveryFee) : "Free"}</strong></span></div>
      </div>
    </article>
  );
}
