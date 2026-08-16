import ProductCard from "@/components/storefront/ProductCard";
import { trpc } from "@/lib/trpc";
import { Heart, Loader2, Share2 } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function SharedWishlist() {
  const [, params] = useRoute("/shared-wishlist/:token");
  const { data: items, isLoading } = trpc.store.sharedWishlist.useQuery({ token: params?.token ?? "" }, { enabled: Boolean(params?.token) });
  if (isLoading) return <main className="container grid min-h-[540px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></main>;
  if (!items) return <main className="container grid min-h-[540px] place-items-center py-16"><div className="text-center"><Heart className="mx-auto h-10 w-10 text-slate-600" /><h1 className="mt-5 text-3xl font-black text-white">Wishlist link unavailable.</h1><p className="mt-2 text-sm text-slate-500">This link may have expired or been disabled.</p><Link href="/shop" className="mt-6 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]">Browse products</Link></div></main>;
  return <main className="container py-10 sm:py-14"><div className="border-b border-white/8 pb-7"><p className="text-xs font-black uppercase tracking-[.17em] text-cyan-300">Shared collection</p><div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="text-4xl font-black tracking-[-.05em] text-white">A Nexus wishlist.</h1><p className="mt-2 text-sm text-slate-400">Products saved for a future drop.</p></div><Share2 className="h-6 w-6 text-cyan-300" /></div></div>{items.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-12 text-center text-sm text-slate-500">This wishlist has no active products.</div>}</main>;
}
