import { startLogin } from "@/const";
import ProductCard from "@/components/storefront/ProductCard";
import { trpc } from "@/lib/trpc";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Wishlist() {
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.store.wishlist.useQuery(undefined, { enabled: Boolean(user) });
  const removeWishlist = trpc.store.removeWishlist.useMutation({ onSuccess: () => { toast.success("Removed from wishlist"); void utils.store.wishlist.invalidate(); } });
  if (authLoading || (user && isLoading)) return <main className="container grid min-h-[540px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></main>;
  if (!user) return <main className="container grid min-h-[540px] place-items-center py-16"><div className="max-w-md text-center"><Heart className="mx-auto h-11 w-11 text-cyan-300" /><h1 className="mt-5 text-3xl font-black text-white">Keep your next drops close.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Sign in to save products and find them later from any device.</p><button onClick={startLogin} className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]">Sign in to wishlist</button></div></main>;
  return <main className="container py-10 sm:py-14"><div className="flex items-end justify-between gap-4 border-b border-white/8 pb-7"><div><p className="text-xs font-black uppercase tracking-[.17em] text-cyan-300">Saved drops</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-white">Your wishlist.</h1><p className="mt-2 text-sm text-slate-400">Keep the pieces you are considering in one place.</p></div><span className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-slate-400">{items?.length ?? 0} saved</span></div>{items?.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(product => <div key={product.id} className="relative"><ProductCard product={product} /><button type="button" onClick={() => removeWishlist.mutate({ productId: product.id })} className="absolute bottom-24 right-5 z-10 rounded-lg border border-white/10 bg-[#0A0A0A]/80 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-slate-400 hover:border-red-300/50 hover:text-red-300">Remove</button></div>)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[.02] p-12 text-center"><ShoppingBag className="mx-auto h-9 w-9 text-cyan-300" /><h2 className="mt-4 font-black text-white">Your wishlist is empty.</h2><p className="mt-2 text-sm text-slate-500">Tap the heart on a drop to save it here.</p><Link href="/shop" className="mt-6 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]">Browse products</Link></div>}</main>;
}
