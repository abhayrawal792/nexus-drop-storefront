import { useCart, type CartProduct } from "@/contexts/CartContext";
import { formatNpr } from "@/lib/format";
import { CheckCircle2, Plus, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type ProductCardProps = { product: CartProduct & { description: string; discountPercent: number; categoryName: string; averageRating: number | null; reviewCount: number } };

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, buyNow } = useCart();
  const [, setLocation] = useLocation();
  const image = product.images[0] || "/manus-storage/hero-gadgets_4fcc5ee6.jpeg";
  const addToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };
  const handleBuyNow = () => {
    buyNow(product);
    setLocation("/checkout");
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/8 bg-[#101821] transition duration-200 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_18px_50px_rgba(6,182,212,0.1)]">
      <Link href={`/products/${product.slug}`} className="block relative aspect-[4/4.2] overflow-hidden bg-[#0b1016]">
        <img src={image} alt={product.name} className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101821] via-transparent to-transparent" />
        {product.discountPercent > 0 && <span className="absolute left-3 top-3 rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-[#061014]">-{product.discountPercent}%</span>}
        <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 backdrop-blur">{product.categoryName}</span>
      </Link>
      <div className="p-4">
        <Link href={`/products/${product.slug}`} className="block"><h3 className="font-semibold text-white transition group-hover:text-cyan-300">{product.name}</h3></Link>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Star className={`h-3.5 w-3.5 ${product.averageRating ? "fill-cyan-300 text-cyan-300" : "text-slate-600"}`} /><span>{product.averageRating ? `${product.averageRating.toFixed(1)} · ${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}</span></div>
        <div className="mt-4"><div className="flex items-end justify-between gap-3"><div><p className="text-lg font-black tracking-tight text-white">{formatNpr(product.price)}</p>{product.originalPrice && <p className="text-xs text-slate-500 line-through">{formatNpr(product.originalPrice)}</p>}</div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{product.stockQuantity > 0 ? `${product.stockQuantity} left` : "Sold out"}</p></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={addToCart} disabled={product.stockQuantity === 0} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-cyan-400 text-xs font-black text-[#061014] transition hover:bg-cyan-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700" aria-label={`Add ${product.name} to cart`}>{product.stockQuantity > 0 ? <Plus className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Add to cart</button><button onClick={handleBuyNow} disabled={product.stockQuantity === 0} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-cyan-300/55 bg-cyan-300/5 text-xs font-black text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/10 active:scale-95 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500" aria-label={`Buy ${product.name} now`}><Zap className="h-3.5 w-3.5" /> Buy now</button></div></div>
      </div>
    </article>
  );
}
