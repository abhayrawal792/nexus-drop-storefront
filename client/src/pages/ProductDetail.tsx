import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { formatNpr } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, ChevronDown, Loader2, Minus, Plus, ShieldCheck, Star, Truck, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const { data: product, isLoading } = trpc.store.product.useQuery({ slug });
  const { data: reviews, refetch: refetchReviews } = trpc.store.reviews.useQuery({ productId: product?.id ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(product?.id) });
  const reviewMutation = trpc.store.submitReview.useMutation({ onSuccess: () => { toast.success("Thanks—your review is now posted."); setReviewText(""); setRating(5); void refetchReviews(); } });
  const { user } = useAuth();
  const { addItem, buyNow } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const images = product?.images?.length ? product.images : ["/manus-storage/hero-gadgets_4fcc5ee6.jpeg"];
  const reviewSummary = useMemo(() => {
    const list = reviews ?? [];
    const average = list.length ? list.reduce((sum, review) => sum + review.rating, 0) / list.length : 0;
    return { count: list.length, average, bars: [5, 4, 3, 2, 1].map(value => ({ value, count: list.filter(review => review.rating === value).length })) };
  }, [reviews]);

  if (isLoading) return <div className="container grid min-h-[480px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div>;
  if (!product) return <div className="container py-20"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to drops</Link><h1 className="mt-6 text-3xl font-black text-white">This drop is no longer available.</h1></div>;

  const addToCart = () => { addItem(product, quantity); toast.success(`${product.name} added to cart`); };
  const handleBuyNow = () => { buyNow(product, quantity); setLocation("/checkout"); };
  const livePrice = product.price * quantity;
  const liveOriginalPrice = product.originalPrice ? product.originalPrice * quantity : null;
  const submitReview = () => {
    if (!user) return startLogin();
    if (reviewText.trim().length < 4) return toast.error("Please write a short review of at least four characters.");
    reviewMutation.mutate({ productId: product.id, rating, comment: reviewText.trim() });
  };

}
