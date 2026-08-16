import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";

const qaProduct = {
  id: "qa-cuban-chain",
  name: "Cuban Chain",
  slug: "cuban-chain",
  price: 999,
  originalPrice: 1499,
  stockQuantity: 12,
  images: ["/manus-storage/cuban-chain_3e06d045.svg"],
};

export default function CheckoutQa() {
  const cart = useCart();
  const [, setLocation] = useLocation();
  const method = new URLSearchParams(window.location.search).get("payment") === "bank" ? "BankTransfer" : "eSewa";

  useEffect(() => {
    if (!cart.items.some(item => item.product.id === qaProduct.id)) cart.buyNow(qaProduct, 1);
  }, [cart]);

  useEffect(() => {
    if (cart.items.some(item => item.product.id === qaProduct.id)) setLocation(`/checkout?qaPayment=${method}`);
  }, [cart.items, method, setLocation]);

  return <main className="container grid min-h-[540px] place-items-center py-16 text-center"><p className="text-sm font-bold text-cyan-300">Preparing checkout QA state…</p></main>;
}
