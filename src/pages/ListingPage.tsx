import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { RestaurantCard } from "../components/RestaurantCard";
import { EmptyState } from "../components/EmptyState";
import { restaurants, foodItems, categories } from "../data/mockData";
import type { SortOption } from "../types";

export function ListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const [cuisines, setCuisines] = useState<string[]>(searchParams.get("cuisine") ? [searchParams.get("cuisine")!] : []);
  const [vegetarian, setVegetarian] = useState(false);
  const [minimumRating, setMinimumRating] = useState("0");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("search") ?? "");
    setCuisines(searchParams.getAll("cuisine"));
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = restaurants.filter((restaurant) => {
      const matchesCuisine = !cuisines.length || cuisines.some((cuisine) => restaurant.cuisines.includes(cuisine));
      const matchesVegetarian = !vegetarian || restaurant.vegetarian;
      const matchesRating = restaurant.rating >= Number(minimumRating);
      const term = query.trim().toLowerCase();
      const matchesSearch = !term ||
        `${restaurant.name} ${restaurant.cuisine}`.toLowerCase().includes(term) ||
        foodItems.some((item) => item.restaurantId === restaurant.id && item.name.toLowerCase().includes(term));
      return matchesCuisine && matchesVegetarian && matchesRating && matchesSearch;
    });
    if (sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
    if (sort === "delivery") result = [...result].sort((a, b) => a.deliveryMinutes - b.deliveryMinutes);
    return result;
  }, [cuisines, vegetarian, minimumRating, query, sort]);

  function toggleCuisine(cuisine: string) {
    const next = cuisines.includes(cuisine) ? cuisines.filter((item) => item !== cuisine) : [...cuisines, cuisine];
    setCuisines(next);
    setSearchParams((previous) => { const params = new URLSearchParams(previous); params.delete("cuisine"); next.forEach((value) => params.append("cuisine", value)); return params; });
  }

  function clearFilters() {
    setCuisines([]);
    setVegetarian(false);
    setMinimumRating("0");
    setQuery("");
    setSearchParams({});
  }

  return <>
    <div className="page-heading"><div className="page-wrap"><span className="eyebrow">The good stuff is close</span><h1>Discover Restaurants</h1><p>Find your next favorite, right around the corner.</p></div></div>
    <div className="page-wrap listing-layout">
      <button className="button button-outline mobile-filter-toggle" onClick={() => setMobileFiltersOpen((open) => !open)}><SlidersHorizontal size={17} /> Filters {mobileFiltersOpen ? <X size={16} /> : null}</button>
      <aside className={`filters-panel${mobileFiltersOpen ? " filters-open" : ""}`} aria-label="Restaurant filters">
        <div className="filter-group"><h3>Cuisine</h3>{categories.map(({ name }) => <label className="check-option" key={name}><input type="checkbox" checked={cuisines.includes(name)} onChange={() => toggleCuisine(name)} />{name}</label>)}</div>
        <div className="filter-group"><h3>Dietary</h3><label className="check-option"><input type="checkbox" checked={vegetarian} onChange={(event) => setVegetarian(event.target.checked)} />Vegetarian options</label></div>
        <div className="filter-group"><h3>Rating</h3>{[["4.5", "4.5 and above"], ["4", "4.0 and above"], ["0", "Any rating"]].map(([value, label]) => <label className="check-option" key={value}><input type="radio" name="rating" value={value} checked={minimumRating === value} onChange={() => setMinimumRating(value)} />{label}</label>)}</div>
        <button className="text-link clear-filters" onClick={clearFilters}>Clear filters</button>
      </aside>
      <div className="listing-results">
        <div className="listing-toolbar"><p><strong>{filtered.length}</strong> places to make you happy</p><label className="sort-label">Sort by <select aria-label="Sort restaurants" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="delivery">Fastest delivery</option></select></label></div>
        <div className="active-filters">{cuisines.map((cuisine) => <button key={cuisine} className="filter-tag" onClick={() => toggleCuisine(cuisine)}>{cuisine} <X size={13} /></button>)}{vegetarian && <button className="filter-tag" onClick={() => setVegetarian(false)}>Vegetarian <X size={13} /></button>}{query && <button className="filter-tag" onClick={() => { setQuery(""); setSearchParams({}); }}>Search: {query} <X size={13} /></button>}</div>
        {filtered.length ? <div className="restaurant-grid listing-grid">{filtered.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}</div> : <EmptyState icon="⌕" title="No bites found" description="Try adjusting your filters or searching another cuisine. Your next favorite is out there." action={<button className="button button-primary" onClick={clearFilters}>Clear filters</button>} />}
      </div>
    </div>
  </>;
}
