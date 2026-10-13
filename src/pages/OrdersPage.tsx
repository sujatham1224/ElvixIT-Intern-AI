import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { formatPrice } from "../lib/format";
import type { DemoOrder } from "../types";

export function OrdersPage() {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem("quickbite-orders") ?? "[]");
      if (!Array.isArray(value)) throw new Error("Order history is not a list.");
      setOrders(value as DemoOrder[]);
    } catch {
      setLoadError("Order history couldn't be read from this browser.");
    }
  }, []);
  if (loadError) return <><div className="page-heading"><div className="page-wrap"><span className="eyebrow">Your delicious timeline</span><h1>Order History</h1><p>Your saved demo orders, all in one place.</p></div></div><div className="page-wrap"><div className="form-error-banner" role="alert">{loadError} Check browser storage settings and reload.</div></div></>;
  if (!orders.length) return <><div className="page-heading"><div className="page-wrap"><span className="eyebrow">Your delicious timeline</span><h1>Order History</h1><p>Every good meal deserves a little nostalgia.</p></div></div><div className="page-wrap"><EmptyState icon={<ClipboardList size={36} />} title="Your next favorite is one order away" description="Once you place a demo order, you'll find all the details right here." action={<Link to="/restaurants" className="button button-primary">Explore Restaurants</Link>} /></div></>;
  return <><div className="page-heading"><div className="page-wrap"><span className="eyebrow">Your delicious timeline</span><h1>Order History</h1><p>Your saved demo orders, all in one place.</p></div></div><div className="page-wrap history-list">{orders.map((order) => <article className="history-card" key={order.reference}><div className="history-details"><div className="history-title"><strong>{order.reference}</strong><span className="status-pill">Demo order placed</span></div><p>{new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p><strong>{formatPrice(order.total)}</strong></div><Link className="button button-outline button-small" to={`/orders/${order.reference}`}>View Details <ArrowRight size={15} /></Link></article>)}</div></>;
}
