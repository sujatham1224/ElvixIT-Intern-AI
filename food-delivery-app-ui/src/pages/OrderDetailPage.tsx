import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { formatPrice } from "../lib/format";
import type { DemoOrder } from "../types";

export function OrderDetailPage() {
  const { reference } = useParams();
  let order: DemoOrder | undefined;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem("quickbite-orders") ?? "[]");
    if (Array.isArray(saved)) order = (saved as DemoOrder[]).find((item) => item.reference === reference);
  } catch {
    order = undefined;
  }
  if (!order) return <div className="page-wrap"><EmptyState icon="⌕" title="Order not found" description="We couldn't find that saved demo order." action={<Link className="button button-primary" to="/orders">Back to order history</Link>} /></div>;
  return <><div className="page-heading"><div className="page-wrap"><span className="eyebrow">Your order</span><h1>Order details</h1><p>Demo order information.</p></div></div><div className="page-wrap order-detail-wrap"><article className="panel order-detail-card"><div className="history-title"><div><span className="eyebrow">Demo order</span><h2>{order.reference}</h2></div><span className="status-pill">Order placed</span></div><p className="muted">{new Date(order.placedAt).toLocaleString("en-IN")}</p><div className="order-address"><strong>Delivering to</strong><span>{order.address}</span>{order.deliveryInstructions && <small>Note: {order.deliveryInstructions}</small>}<small>Demo payment · {order.paymentMethod}</small></div><h3>Items</h3>{order.items.map((item) => <div className="summary-line" key={item.id}><span>{item.quantity} × {item.name}</span><strong>{formatPrice(item.quantity * item.price)}</strong></div>)}<div className="summary-divider" /><div className="summary-line"><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></div><div className="summary-line"><span>Delivery fee</span><strong>{order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}</strong></div>{order.discount > 0 && <div className="summary-line discount-line"><span>FIRSTBITE discount</span><strong>−{formatPrice(order.discount)}</strong></div>}<div className="summary-line total-line"><span>Total (demo)</span><strong>{formatPrice(order.total)}</strong></div><div className="demo-notice">Illustrative order details only. No real order or delivery was created.</div><Link to="/orders" className="text-link"><ArrowLeft size={15} /> Back to Order History</Link></article></div></>;
}
