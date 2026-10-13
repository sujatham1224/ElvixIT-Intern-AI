import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useCart } from "../hooks/useCart";
import { formatPrice } from "../lib/format";

export function CartPage() {
  const { items, count, subtotal, deliveryFee, discount, total, promoCode, updateQuantity, remove, applyPromo, clearPromo } = useCart();
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);
  function redeemPromo() {
    const applied = applyPromo(promoInput);
    setPromoError(!applied);
    setPromoMessage(applied ? "" : "That code didn't work. Try FIRSTBITE.");
  }
  if (!items.length) return <><div className="page-heading"><div className="page-wrap"><span className="eyebrow">Almost there</span><h1>Your cart</h1><p>A very good decision, if you ask us.</p></div></div><div className="page-wrap"><EmptyState icon={<ShoppingBag size={36} />} title="Your bag is taking a little nap" description="It's a little empty in here. Let's find something delicious to fill it with." action={<Link to="/restaurants" className="button button-primary">Explore Food</Link>} /></div></>;
  return <>
    <div className="page-heading"><div className="page-wrap"><span className="eyebrow">Almost there</span><h1>Your cart</h1><p>{count} delicious {count === 1 ? "item" : "items"} in your bag.</p></div></div>
    <div className="page-wrap cart-layout"><section className="cart-items panel" aria-label="Your items"><h2>Your items <span className="muted">({count})</span></h2>{items.map((item) => <article className="cart-row" key={item.id}><img src={item.image} alt={item.name} /><div className="cart-item-info"><h3>{item.name}</h3><p>{formatPrice(item.price)} each</p><button className="remove-button" onClick={() => remove(item.id)}><Trash2 size={14} /> Remove</button></div><div className="cart-item-controls"><strong>{formatPrice(item.price * item.quantity)}</strong><div className="quantity-control"><button aria-label={`Decrease ${item.name} quantity`} onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button><span aria-live="polite">{item.quantity}</span><button aria-label={`Increase ${item.name} quantity`} onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button></div></div></article>)}<Link className="text-link continue-link" to="/restaurants"><ArrowLeft size={15} /> Continue shopping</Link></section>
      <aside className="panel order-summary"><h2>Order summary</h2><form className="promo-form" onSubmit={(event) => { event.preventDefault(); redeemPromo(); }}><label className="sr-only" htmlFor="promo-code">Promo code</label><input id="promo-code" className="form-input" value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="Promo code" disabled={Boolean(promoCode)} /><button className="button button-outline button-small" type={promoCode ? "button" : "submit"} onClick={promoCode ? () => { clearPromo(); setPromoInput(""); setPromoMessage(""); setPromoError(false); } : undefined}>{promoCode ? "Remove" : "Apply"}</button></form>{(promoCode || promoMessage) && <p className={`promo-message${promoError ? " promo-error" : ""}`} role={promoError ? "alert" : "status"}>{promoCode ? `FIRSTBITE applied — ${formatPrice(discount)} off` : promoMessage}</p>}<div className="summary-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="summary-line"><span>Delivery fee</span><strong>{deliveryFee ? formatPrice(deliveryFee) : "Free"}</strong></div>{discount > 0 && <div className="summary-line discount-line"><span>FIRSTBITE discount</span><strong>−{formatPrice(discount)}</strong></div>}<div className="summary-line total-line"><span>Total</span><strong>{formatPrice(total)}</strong></div><button className="button button-primary button-full" onClick={() => navigate("/checkout")}>Proceed to Checkout <span>→</span></button><p className="summary-note">Demo checkout · No real payment</p></aside>
    </div>
  </>;
}
