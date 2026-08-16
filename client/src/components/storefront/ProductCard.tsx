import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart, type CartProduct } from "@/contexts/CartContext";
import { formatNpr } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { getQuickViewPurchaseState } from "@/lib/quickView";
import { startLogin } from "@/const";
import { CheckCircle2, Eye, Heart, Plus, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type ProductCardProps = { product: CartProduct & { description: string; discountPercent: number; categoryName: string; averageRating: number | null; reviewCount: number } };

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, buyNow } = useCart();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const { data: wishlist } = trpc.store.wishlist.useQuery(undefined, { enabled: Boolean(user) });
  const addWishlist = trpc.store.addWishlist.useMutation({ onSuccess: () => { toast.success("Saved to wishlist"); void utils.store.wishlist.invalidate(); } });
  const removeWishlist = trpc.store.removeWishlist.useMutation({ onSuccess: () => { toast.success("Removed from wishlist"); void utils.store.wishlist.invalidate(); } });
  const [, setLocation] = useLocation();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("quickView") === product.slug) setQuickViewOpen(true);
  }, [product.slug]);
  const image = product.images[0] || "/manus-storage/hero-gadgets_4fcc5ee6.jpeg";
  const addToCart = () => { addItem(product); toast.success(`${product.name} added to cart`); };
  const handleBuyNow = () => { buyNow(product); setLocation("/checkout"); };
  const { canPurchase, stockLabel } = getQuickViewPurchaseState(product.stockQuantity);
  const isWishlisted = Boolean(wishlist?.some(item => item.id === product.id));
  const toggleWishlist = () => { if (!user) return startLogin(); if (isWishlisted) removeWishlist.mutate({ productId: product.id }); else addWishlist.mutate({ productId: product.id }); };
  const discountCopy = product.discountPercent > 0 ? `Save ${product.discountPercent}% today` : "Ready to ship";

  return <>
    <article className="group overflow-hidden rounded-2xl border border-white/8 bg-[#101821] transition duration-200 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_18px_50px_rgba(6,182,212,0.1)]">
      <div className="relative"><Link href={`/products/${product.slug}`} className="block relative aspect-[4/4.2] overflow-hidden bg-slate-100"><img src={image} alt={product.name} className="h-full w-full bg-slate-100 object-contain p-1 opacity-100 transition duration-500 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-[#101821]/85 via-transparent to-transparent" />{product.discountPercent > 0 && <span className="absolute left-3 top-3 rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-[#061014]">-{product.discountPercent}%</span>}<span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/80 backdrop-blur">{product.categoryName}</span></Link><div className="absolute right-3 top-3 flex gap-2"><button type="button" onClick={toggleWishlist} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-200" aria-label={`${isWishlisted ? "Remove" : "Save"} ${product.name} ${isWishlisted ? "from" : "to"} wishlist`}><Heart className={`h-4 w-4 ${isWishlisted ? "fill-cyan-300 text-cyan-300" : ""}`} /></button><button type="button" onClick={() => setQuickViewOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-white backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-200" aria-label={`Quick view ${product.name}`}><Eye className="h-3.5 w-3.5" /> Quick view</button></div></div>
      <div className="p-4"><Link href={`/products/${product.slug}`} className="block"><h3 className="font-semibold text-white transition group-hover:text-cyan-300">{product.name}</h3></Link><div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Star className={`h-3.5 w-3.5 ${product.averageRating ? "fill-cyan-300 text-cyan-300" : "text-slate-600"}`} /><span>{product.averageRating ? `${product.averageRating.toFixed(1)} · ${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}</span></div><div className="mt-4"><div className="flex items-end justify-between gap-3"><div><p className="text-lg font-black tracking-tight text-white">{formatNpr(product.price)}</p>{product.originalPrice && <p className="text-xs text-slate-500 line-through">{formatNpr(product.originalPrice)}</p>}</div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{product.stockQuantity > 0 ? `${product.stockQuantity} left` : "Sold out"}</p></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={addToCart} disabled={!canPurchase} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-cyan-400 text-xs font-black text-[#061014] transition hover:bg-cyan-300 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700" aria-label={`Add ${product.name} to cart`}>{product.stockQuantity > 0 ? <Plus className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Add to cart</button><button onClick={handleBuyNow} disabled={!canPurchase} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-cyan-300/55 bg-cyan-300/5 text-xs font-black text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/10 active:scale-95 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500" aria-label={`Buy ${product.name} now`}><Zap className="h-3.5 w-3.5" /> Buy now</button></div></div></div>
    </article>
    <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}><DialogContent className="max-w-2xl border-white/10 bg-[#101821] text-white"><div className="grid gap-6 sm:grid-cols-[minmax(0,.85fr)_1.15fr]"><img src={image} alt={product.name} className="aspect-square w-full rounded-2xl border border-white/10 bg-[#0b1016] object-cover" /><div><DialogHeader className="text-left"><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">{product.categoryName}</p><DialogTitle className="mt-2 text-3xl font-black tracking-[-.05em] text-white">{product.name}</DialogTitle><DialogDescription className="mt-3 text-sm leading-6 text-slate-400">{product.description}</DialogDescription></DialogHeader><div className="mt-6 flex items-end justify-between border-y border-white/8 py-4"><div><p className="text-2xl font-black text-white">{formatNpr(product.price)}</p>{product.originalPrice && <p className="text-xs text-slate-500 line-through">{formatNpr(product.originalPrice)}</p>}</div><div className="text-right"><p className="text-xs font-bold text-cyan-300">{discountCopy}</p><p className="mt-1 text-xs text-slate-500">{stockLabel}</p></div></div><div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={addToCart} disabled={!canPurchase} className="h-11 rounded-xl bg-cyan-400 text-sm font-black text-[#061014] transition hover:bg-cyan-300 disabled:opacity-50">Add to cart</button><button onClick={handleBuyNow} disabled={!canPurchase} className="h-11 rounded-xl border border-cyan-300/50 text-sm font-black text-cyan-200 transition hover:bg-cyan-300/10 disabled:opacity-50">Buy now</button></div><Link href={`/products/${product.slug}`} onClick={() => setQuickViewOpen(false)} className="mt-4 inline-flex text-sm font-bold text-slate-400 hover:text-cyan-300">View full product details →</Link></div></div></DialogContent></Dialog>
  </>;
}
