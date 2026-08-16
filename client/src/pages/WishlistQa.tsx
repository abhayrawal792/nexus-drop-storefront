import { trpc } from "@/lib/trpc";
import { Heart, Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";

export default function WishlistQa() {
  const action = useMemo(() => new URLSearchParams(window.location.search).get("action"), []);
  const { data: user } = trpc.auth.me.useQuery();
  const { data: products, isLoading: productsLoading } = trpc.store.catalog.useQuery({ sort: "newest" }, { enabled: Boolean(user) });
  const utils = trpc.useUtils();
  const { data: wishlist, isLoading: wishlistLoading } = trpc.store.wishlist.useQuery(undefined, { enabled: Boolean(user) });
  const add = trpc.store.addWishlist.useMutation({ onSuccess: () => void utils.store.wishlist.invalidate() });
  const remove = trpc.store.removeWishlist.useMutation({ onSuccess: () => void utils.store.wishlist.invalidate() });
  const product = products?.[0];
  const saved = Boolean(product && wishlist?.some(item => item.id === product.id));
  useEffect(() => {
    if (!product || !action || add.isPending || remove.isPending) return;
    if (action === "save" && !saved) add.mutate({ productId: product.id });
    if (action === "remove" && saved) remove.mutate({ productId: product.id });
  }, [action, add, product, remove, saved]);
  if (!user) return <main className="container grid min-h-[540px] place-items-center text-center"><div><Heart className="mx-auto h-10 w-10 text-cyan-300" /><h1 className="mt-4 text-2xl font-black text-white">Wishlist QA requires a signed-in account.</h1></div></main>;
  if (productsLoading || wishlistLoading || !product) return <main className="container grid min-h-[540px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></main>;
  return <main className="container max-w-2xl py-16"><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">Development QA only</p><h1 className="mt-3 text-3xl font-black text-white">Wishlist save/remove verification</h1><p className="mt-2 text-sm text-slate-400">Uses the first live catalog product and the same authenticated mutations as the storefront.</p><article className="mt-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#101821] p-5"><img src={product.images[0]} alt={product.name} className="h-20 w-20 rounded-xl object-cover" /><div className="flex-1"><p className="font-black text-white">{product.name}</p><p className="mt-1 text-sm text-slate-400">Current state: <strong className={saved ? "text-cyan-300" : "text-slate-300"}>{saved ? "Saved" : "Not saved"}</strong></p></div><button type="button" onClick={() => saved ? remove.mutate({ productId: product.id }) : add.mutate({ productId: product.id })} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#061014]">{saved ? "Remove" : "Save"}</button></article></main>;
}
