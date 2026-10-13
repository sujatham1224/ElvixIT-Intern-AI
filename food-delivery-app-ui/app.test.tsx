import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { CartProvider } from "../src/hooks/useCart";

function renderApp() {
  return render(
    <MemoryRouter>
      <CartProvider><App /></CartProvider>
    </MemoryRouter>,
  );
}

describe("QuickBite ordering flow", () => {
  it("adds food to the cart and updates its quantity and total", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Add Butter Chicken to cart" }));
    await user.click(screen.getByRole("button", { name: "Shopping bag, 1 items" }));

    const cart = screen.getByRole("region", { name: /Your items/i });
    expect(within(cart).getByText("Butter Chicken")).toBeInTheDocument();
    await user.click(within(cart).getByRole("button", { name: "Increase Butter Chicken quantity" }));
    expect(within(cart).getByText("₹658")).toBeInTheDocument();
    expect(screen.getByText("₹683")).toBeInTheDocument();
  });

  it("shows actionable validation errors for an incomplete checkout", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Add Butter Chicken to cart" }));
    await user.click(screen.getByRole("button", { name: "Shopping bag, 1 items" }));
    await user.click(screen.getAllByRole("button", { name: /Proceed to Checkout/i })[0]);
    await user.click(screen.getByRole("button", { name: /^Place Demo Order/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields.");
    expect(screen.getByText("Enter your street address.")).toBeInTheDocument();
  });

  it("places a demo order and shows its generated reference", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Add Butter Chicken to cart" }));
    await user.click(screen.getByRole("button", { name: "Shopping bag, 1 items" }));
    await user.type(screen.getByLabelText("Promo code"), "FIRSTBITE");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("status")).toHaveTextContent("FIRSTBITE applied — ₹150 off");
    await user.click(screen.getAllByRole("button", { name: /Proceed to Checkout/i })[0]);
    await user.type(screen.getByLabelText("Street address *"), "12 Garden Street");
    await user.type(screen.getByLabelText("Area / locality *"), "Indiranagar");
    await user.type(screen.getByLabelText("PIN code *"), "560038");
    await user.type(screen.getByLabelText("Full name *"), "Asha Rao");
    await user.type(screen.getByLabelText("Phone number *"), "9876543210");
    await user.click(screen.getByRole("button", { name: /^Place Demo Order/ }));

    expect(await screen.findByRole("heading", { name: "Your order has been placed!" })).toBeInTheDocument();
    expect(screen.getByText(/^QB-[A-Z0-9]{6}$/)).toBeInTheDocument();
    const [order] = JSON.parse(localStorage.getItem("quickbite-orders") ?? "[]");
    expect(order.discount).toBe(150);
    expect(order.total).toBe(204);
  });
});
