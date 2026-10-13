import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Clock3, MapPin, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "../hooks/useCart";

export function Layout() {
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get("search") ?? "");
  }, [location.pathname, location.search]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(`/restaurants${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`);
    setMobileSearch(false);
  }

  return (
    <>
      <header className="site-header">
        <nav className="nav-shell page-wrap" aria-label="Main navigation">
          <Link to="/" className="brand" aria-label="QuickBite home">
            <span className="brand-mark">q</span><span>QuickBite</span>
          </Link>
          <div className="location"><MapPin size={18} /><span><small>Delivering to</small><strong>Indiranagar, Bengaluru</strong></span></div>
          <form className={`header-search${mobileSearch ? " mobile-open" : ""}`} onSubmit={submitSearch} role="search">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Search dishes or restaurants" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes or restaurants" />
            {mobileSearch && <button className="search-close" type="button" aria-label="Close search" onClick={() => setMobileSearch(false)}><X size={19} /></button>}
          </form>
          <div className="nav-actions">
            <NavLink to="/orders" className="orders-link"><Clock3 size={17} /> <span>My orders</span></NavLink>
            <button className="icon-button search-toggle" aria-label="Open search" onClick={() => setMobileSearch(true)}><Search size={19} /></button>
            <button className="icon-button" aria-label={`Shopping bag, ${count} items`} onClick={() => navigate("/cart")}><ShoppingBag size={19} /><span className="cart-badge">{count}</span></button>
            <button className="icon-button account-button" aria-label="View order history" onClick={() => navigate("/orders")}><UserRound size={19} /></button>
          </div>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="page-wrap footer-inner">
          <div><Link to="/" className="brand footer-brand"><span className="brand-mark">q</span><span>QuickBite</span></Link><p>Good food, great mood. Supporting the local spots that make your neighborhood delicious.</p></div>
          <div className="footer-links"><div><strong>QuickBite</strong><Link to="/">About us</Link><Link to="/restaurants">Restaurants</Link><Link to="/orders">My orders</Link></div><div><strong>We're here</strong><a href="mailto:hello@quickbite.example">Contact</a><Link to="/orders">Help & support</Link><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a></div></div>
        </div>
        <div className="page-wrap footer-bottom"><span>© 2025 QuickBite. Made with a little extra spice.</span><span>Demo experience · No real orders or payments</span></div>
      </footer>
    </>
  );
}
