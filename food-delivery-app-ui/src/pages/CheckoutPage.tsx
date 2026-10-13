import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { formatPrice } from "../lib/format";
import type { DemoOrder } from "../types";

interface FormValues {
  address: string;
  area: string;
  pincode: string;
  name: string;
  phone: string;
  instructions: string;
}

type FieldName = keyof FormValues;
const initialValues: FormValues = { address: "", area: "", pincode: "", name: "", phone: "", instructions: "" };

export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [payment, setPayment] = useState("Cash on delivery");
  if (!cart.items.length) return <div className="page-wrap checkout-empty"><p>Your cart is empty. Add a few favorites before checkout.</p><button className="button button-primary" onClick={() => navigate("/restaurants")}>Explore restaurants</button></div>;

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (values.address.trim().length < 5) nextErrors.address = "Enter your street address.";
    if (values.area.trim().length < 2) nextErrors.area = "Enter your area or locality.";
    if (!/^\d{6}$/.test(values.pincode.trim())) nextErrors.pincode = "Enter a valid 6-digit PIN code.";
    if (values.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!/^[+]?[0-9\s()-]{10,16}$/.test(values.phone.trim())) nextErrors.phone = "Enter a valid phone number.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFormError("Please check the highlighted fields.");
      document.querySelector<HTMLElement>(".field-error input")?.focus();
      return;
    }
    const order: DemoOrder = {
      reference: `QB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      placedAt: new Date().toISOString(),
      customerName: values.name.trim(),
      address: `${values.address.trim()}, ${values.area.trim()} ${values.pincode.trim()}`,
      items: cart.items,
      subtotal: cart.subtotal,
      deliveryFee: cart.deliveryFee,
      discount: cart.discount,
      total: cart.total,
      paymentMethod: payment,
      deliveryInstructions: values.instructions.trim(),
    };
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("quickbite-orders") ?? "[]");
      if (!Array.isArray(saved)) throw new Error("Order history is not a list.");
      const orders = saved as DemoOrder[];
      orders.unshift(order);
      localStorage.setItem("quickbite-orders", JSON.stringify(orders));
      sessionStorage.setItem("quickbite-last-order", JSON.stringify(order));
    } catch {
      setFormError("Your demo order could not be saved in this browser. Check storage settings and try again.");
      return;
    }
    cart.clear();
    navigate("/confirmation");
  }

  function field(name: FieldName, label: string, placeholder: string, props: { inputMode?: "text" | "numeric" | "tel"; full?: boolean } = {}) {
    return <div className={`form-field${props.full ? " field-full" : ""}${errors[name] ? " field-error" : ""}`}><label htmlFor={name}>{label} *</label><input id={name} name={name} className="form-input" value={values[name]} placeholder={placeholder} inputMode={props.inputMode} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} onChange={(event) => update(name, event.target.value)} />{errors[name] && <span className="field-error-message" id={`${name}-error`}>{errors[name]}</span>}</div>;
  }

  return <>
    <div className="page-heading"><div className="page-wrap"><span className="eyebrow">Just a few details</span><h1>Checkout</h1><p>Demo checkout — no real payment or delivery booking.</p></div></div>
    <div className="page-wrap checkout-layout"><form className="panel checkout-form" onSubmit={submit} noValidate>
      {formError && <div className="form-error-banner" role="alert">{formError}</div>}
      <section className="form-section"><h2>Delivery address</h2><div className="form-grid">{field("address", "Street address", "House / flat number, street", { full: true })}{field("area", "Area / locality", "e.g. Indiranagar")}{field("pincode", "PIN code", "6-digit PIN code", { inputMode: "numeric" })}</div></section>
      <section className="form-section"><h2>Contact information</h2><div className="form-grid">{field("name", "Full name", "Your name")}{field("phone", "Phone number", "+91 98765 43210", { inputMode: "tel" })}<div className="form-field field-full"><label htmlFor="instructions">Delivery instructions <span>(optional)</span></label><textarea id="instructions" className="form-input form-textarea" value={values.instructions} placeholder="Anything the delivery partner should know?" onChange={(event) => update("instructions", event.target.value)} /></div></div></section>
      <section className="form-section"><h2>Payment method</h2><div className="payment-options">{["Cash on delivery", "UPI (demo)"].map((option) => <label className={`payment-option${payment === option ? " payment-selected" : ""}`} key={option}><input type="radio" name="payment" value={option} checked={payment === option} onChange={() => setPayment(option)} />{option}</label>)}</div><div className="demo-notice">Demo only. No payment will be collected and no delivery will be booked.</div></section>
      <button className="button button-primary" type="submit">Place Demo Order <span>→</span></button>
    </form><aside className="panel order-summary checkout-summary"><h2>Your order</h2>{cart.items.map((item) => <div className="summary-line" key={item.id}><span>{item.quantity} × {item.name}</span><strong>{formatPrice(item.quantity * item.price)}</strong></div>)}<div className="summary-divider" /><div className="summary-line"><span>Subtotal</span><strong>{formatPrice(cart.subtotal)}</strong></div><div className="summary-line"><span>Delivery fee</span><strong>{cart.deliveryFee ? formatPrice(cart.deliveryFee) : "Free"}</strong></div>{cart.discount > 0 && <div className="summary-line discount-line"><span>FIRSTBITE discount</span><strong>−{formatPrice(cart.discount)}</strong></div>}<div className="summary-line total-line"><span>Total</span><strong>{formatPrice(cart.total)}</strong></div><div className="demo-notice">This is a demo order. No payment will be processed.</div></aside></div>
  </>;
}
