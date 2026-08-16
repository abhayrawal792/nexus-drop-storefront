import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { startLogin } from "@/const";
import { useAuth } from "./_core/hooks/useAuth";
import { Link, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import StoreShell from "./components/storefront/StoreShell";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import CheckoutQa from "./pages/CheckoutQa";
import Home from "./pages/Home";
import Wishlist from "./pages/Wishlist";
import WishlistQa from "./pages/WishlistQa";
import SharedWishlist from "./pages/SharedWishlist";
import OrderConfirmation from "./pages/OrderConfirmation";
import Policy from "./pages/Policy";
import ProductDetail from "./pages/ProductDetail";
import Shop from "./pages/Shop";
import { lazy, Suspense } from "react";

const Admin = lazy(() => import("./pages/Admin"));

function StorefrontRoutes() {
  return <StoreShell><Switch>
    <Route path="/" component={Home} />
    <Route path="/shop" component={Shop} />
    <Route path="/collections/:category" component={Shop} />
    <Route path="/products/:slug" component={ProductDetail} />
    <Route path="/cart" component={Cart} />
    <Route path="/contact" component={Contact} />
    {import.meta.env.DEV && <Route path="/__qa/checkout" component={CheckoutQa} />}{import.meta.env.DEV && <Route path="/__qa/wishlist" component={WishlistQa} />}<Route path="/checkout" component={Checkout} />
    <Route path="/account" component={Account} />
    <Route path="/wishlist" component={Wishlist} />
    <Route path="/shared-wishlist/:token" component={SharedWishlist} />
    <Route path="/order-confirmation" component={OrderConfirmation} />
    <Route path="/policies/:policy" component={Policy} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></StoreShell>;
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#0A0A0A] text-sm font-bold text-cyan-300">Checking admin access…</div>;
  if (!user) return <AccessDenied title="Admin sign-in required" copy="This workspace is private. Sign in with an authorized admin account to continue." action={<button type="button" onClick={() => startLogin()} className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]">Sign in</button>} />;
  if (user.role !== "admin") return <AccessDenied title="Access restricted" copy="Your account does not have permission to open the Nexus Drop operations workspace." action={<Link href="/" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]">Return to storefront</Link>} />;
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#0A0A0A] text-sm font-bold text-cyan-300">Loading operations workspace…</div>}><Admin /></Suspense>;
}

function AccessDenied({ title, copy, action }: { title: string; copy: string; action: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#0A0A0A] px-6 text-center text-white"><div className="max-w-md"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Nexus Drop operations</p><h1 className="mt-3 text-3xl font-black">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p><div className="mt-6">{action}</div></div></main>;
}

function Router() {
  return <Switch><Route path="/admin" component={AdminRoute} /><Route component={StorefrontRoutes} /></Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><CartProvider><Toaster /><Router /></CartProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
