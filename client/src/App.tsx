import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import OrderConfirmation from "./pages/OrderConfirmation";
import StoreShell from "./components/storefront/StoreShell";
import { CartProvider } from "./contexts/CartContext";
import Policy from "./pages/Policy";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";

function Router() {
  return (
    <StoreShell>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/shop"} component={Shop} />
        <Route path={"/collections/:category"} component={Shop} />
        <Route path={"/products/:slug"} component={ProductDetail} />
        <Route path={"/cart"} component={Cart} />
        <Route path={"/checkout"} component={Checkout} />
        <Route path={"/account"} component={Account} />
        <Route path={"/order-confirmation"} component={OrderConfirmation} />
        <Route path={"/policies/:policy"} component={Policy} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </StoreShell>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <Router />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
