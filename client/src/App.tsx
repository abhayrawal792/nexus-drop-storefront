import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
    <Route path="/order-confirmation" component={OrderConfirmation} />
    <Route path="/policies/:policy" component={Policy} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></StoreShell>;
}

function AdminRoute() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#0A0A0A] text-sm font-bold text-cyan-300">Loading operations workspace…</div>}><Admin /></Suspense>;
}

function Router() {
  return <Switch><Route path="/admin" component={AdminRoute} /><Route component={StorefrontRoutes} /></Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><CartProvider><Toaster /><Router /></CartProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
