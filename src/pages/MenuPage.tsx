import { useMemo, useState } from "react";
import { ArrowLeft, Clock3, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { FoodCard } from "../components/FoodCard";
import { foodItems, restaurants } from "../data/mockData";
import { useCart } from "../hooks/useCart";
import { formatPrice } from "../lib/format";

export function MenuPage() {
  const { restaurantId } = useParams();
  const restaurant = restaurants.find((item) => item.id === restaurantId);
  const items = useMemo(() => foodItems.filter((item) => item.restaurantId === restaurantId), [restaurantId]);
  const categories = [...new Set(items.map((item) => item.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");
  const { add, count, total } = useCart();
  if (!restaurant) return <div className="page-wrap menu-not-found"><EmptyState icon="🍽️" title="Restaurant not found" description="This menu may have moved. Explore nearby restaurants instead." action={<Link className="button button-primary" to="/restaurants">Browse restaurants</Link>} /></div>;
  return <>
    <section className="restaurant-cover"><img src={restaurant.cover} alt={`${restaurant.name} restaurant`} /><div className="cover-shade" /><div className="page-wrap cover-info"><Link to="/restaurants" className="cover-back"><ArrowLeft size={16} /> All restaurants</Link><span className="eyebrow">Neighborhood favorite</span><h1>{restaurant.name}</h1><div className="cover-meta"><span><Star size={15} fill="currentColor" /> {restaurant.rating} <span className="cover-subtle">(500+ ratings)</span></span><span>{restaurant.cuisine}</span><span><Clock3 size={15} /> {restaurant.deliveryMinutes}–{restaurant.deliveryMinutes + 10} min</span><span>Delivery {formatPrice(restaurant.deliveryFee)}</span></div></div></section>
    <div className="page-wrap menu-layout"><nav className="menu-categories" aria-label="Menu categories">{categories.map((category) => <a href={`#${category}`} key={category} className={activeCategory === category ? "selected" : ""} onClick={() => setActiveCategory(category)}>{category}</a>)}</nav><div className="menu-content">{categories.map((category) => <section id={category} key={category} className="menu-category"><span className="eyebrow">Made fresh, just for you</span><h2>{category}</h2><div className="food-grid menu-food-grid">{items.filter((item) => item.category === category).map((item) => <FoodCard key={item.id} item={item} onAdd={add} />)}</div></section>)}</div></div>
    {count > 0 && <div className="mobile-cart-summary"><span><strong>{count} items</strong><small>{formatPrice(total)}</small></span><Link className="button button-primary" to="/cart">View bag →</Link></div>}
  </>;
}
