import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_CHARGE } from "@shared/commerce";
import { buildBuyNowCart } from "@/lib/cartPurchase";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartProduct = {
  id: string; name: string; slug: string; price: number; originalPrice: number | null; stockQuantity: number; images: string[];
};

export type CartLine = { product: CartProduct; quantity: number };

type CartContextValue = {
  items: CartLine[]; subtotal: number; discountPercent: number; discountAmount: number; deliveryCharge: number; total: number; couponCode: string;
  addItem: (product: CartProduct, quantity?: number) => void; buyNow: (product: CartProduct, quantity?: number) => void; updateQuantity: (id: string, quantity: number) => void; removeItem: (id: string) => void;
  clearCart: () => void; applyCoupon: (code: string, discountPercent: number) => void; removeCoupon: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "nexus-drop-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(CART_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { items?: CartLine[]; couponCode?: string; discountPercent?: number };
      setItems(parsed.items ?? []); setCouponCode(parsed.couponCode ?? ""); setDiscountPercent(parsed.discountPercent ?? 0);
    } catch { localStorage.removeItem(CART_KEY); }
  }, []);

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify({ items, couponCode, discountPercent })); }, [items, couponCode, discountPercent]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const deliveryCharge = items.length === 0 ? 0 : subtotal > FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_CHARGE;
    return {
      items, subtotal, couponCode, discountPercent, discountAmount, deliveryCharge, total: Math.max(0, subtotal - discountAmount + deliveryCharge),
      addItem(product, quantity = 1) { setItems(current => { const currentItem = current.find(item => item.product.id === product.id); if (!currentItem) return [...current, { product, quantity: Math.min(quantity, product.stockQuantity) }]; return current.map(item => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.stockQuantity) } : item); }); },
      buyNow(product, quantity = 1) { setItems(buildBuyNowCart(product, quantity)); setCouponCode(""); setDiscountPercent(0); },
      updateQuantity(id, quantity) { setItems(current => current.flatMap(item => item.product.id === id ? (quantity <= 0 ? [] : [{ ...item, quantity: Math.min(quantity, item.product.stockQuantity) }]) : [item])); },
      removeItem(id) { setItems(current => current.filter(item => item.product.id !== id)); },
      clearCart() { setItems([]); setCouponCode(""); setDiscountPercent(0); },
      applyCoupon(code, percentage) { setCouponCode(code.toUpperCase()); setDiscountPercent(Math.min(30, Math.max(0, percentage))); },
      removeCoupon() { setCouponCode(""); setDiscountPercent(0); },
    };
  }, [items, couponCode, discountPercent]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
