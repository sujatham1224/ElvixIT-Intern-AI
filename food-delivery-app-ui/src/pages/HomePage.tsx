import { ArrowRight, ArrowUpRight, Leaf, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FoodCard } from "../components/FoodCard";
import { RestaurantCard } from "../components/RestaurantCard";
import { categories, foodItems, restaurants } from "../data/mockData";
import { useCart } from "../hooks/useCart";

export function HomePage() {
  const navigate = useNavigate();
  const { add } = useCart();
  return <>
    <section className="hero-section"><div className="page-wrap"><div className="hero-panel"><div className="hero-copy"><span className="eyebrow">Good food. Great mood.</span><h1>Your favorite food,<br />delivered <span>fresh.</span></h1><p>Cravings don't wait, and neither should you. Get the good stuff delivered to your door.</p><button className="button button-primary" onClick={() => navigate("/restaurants")}>Explore Restaurants <ArrowRight size={17} /></button><div className="hero-proof"><span className="proof-avatars">● ● ●</span><span>Loved by local foodies</span><strong>4.9 <span>★</span></strong></div></div><div className="hero-visual"><img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1100&q=85" alt="Fresh colorful salad bowl" /><span className="hero-stamp">MADE FRESH<br />JUST FOR YOU</span><div className="hero-note"><Sparkles size={16} /><span><strong>Fresh picks</strong><br />from your neighborhood</span></div></div></div></div></section>
    <section className="section-block category-section"><div className="page-wrap"><div className="section-heading"><div><span className="eyebrow">What are you craving?</span><h2>Explore by category</h2></div><button className="text-link" onClick={() => navigate("/restaurants")}>All restaurants <ArrowUpRight size={16} /></button></div><div className="category-row">{categories.map((category) => <button key={category.name} className="category-chip" onClick={() => navigate(`/restaurants?cuisine=${encodeURIComponent(category.name)}`)}><span>{category.icon}</span>{category.name}</button>)}</div></div></section>
    <section className="section-block cream-block"><div className="page-wrap"><div className="section-heading"><div><span className="eyebrow">Handpicked for you</span><h2>Popular near you</h2><p>Local favorites, delivered with love.</p></div><button className="text-link" onClick={() => navigate("/restaurants")}>View all <ArrowRight size={16} /></button></div><div className="restaurant-grid">{restaurants.slice(0, 3).map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}</div></div></section>
    <section className="section-block"><div className="page-wrap"><div className="section-heading"><div><span className="eyebrow">Worth the craving</span><h2>Popular dishes</h2></div><button className="text-link" onClick={() => navigate("/restaurants")}>Explore menu <ArrowRight size={16} /></button></div><div className="food-grid">{foodItems.slice(0, 4).map((item) => <FoodCard key={item.id} item={item} onAdd={add} />)}</div></div></section>
    <section className="page-wrap offer-wrap"><div className="offer-banner"><div><span className="eyebrow">A little something extra</span><h2>Your first bite is on us.</h2><p>Enjoy ₹150 off your first order. Use code <strong>FIRSTBITE</strong></p></div><div className="offer-art"><Leaf size={38} /><button className="button button-primary" onClick={() => navigate("/restaurants")}>Find your favorite <ArrowRight size={16} /></button></div></div></section>
  </>;
}
