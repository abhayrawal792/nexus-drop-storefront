import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import StoreShell from "./components/storefront/StoreShell";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import OrderConfirmation from "./pages/OrderConfirmation";
import Policy from "./pages/Policy";
import ProductDetail from "./pages/ProductDetail";
import Shop from "./pages/Shop";

function StorefrontRoutes() {
  return <StoreShell><Switch>
    <Route path="/" component={Home} />
    <Route path="/shop" component={Shop} />
    <Route path="/collections/:category" component={Shop} />
    <Route path="/products/:slug" component={ProductDetail} />
    <Route path="/cart" component={Cart} />
    <Route path="/checkout" component={Checkout} />
    <Route path="/account" component={Account} />
    <Route path="/order-confirmation" component={OrderConfirmation} />
    <Route path="/policies/:policy" component={Policy} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></StoreShell>;
}

function Router() {
  return <Switch><Route path="/admin" component={Admin} /><Route component={StorefrontRoutes} /></Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><CartProvider><Toaster /><Router /></CartProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
