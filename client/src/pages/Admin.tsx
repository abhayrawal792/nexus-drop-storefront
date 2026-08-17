import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate, formatNpr } from "@/lib/format";
import { buildAnalyticsCsv } from "@/lib/analyticsExport";
import { getAnalyticsQuickRange } from "@/lib/analyticsRanges";
import { buildActivityCsv } from "@/lib/activityExport";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  BellRing,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Heart,
  ImagePlus,
  Loader2,
  Package,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  ShieldAlert,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Tab = "overview" | "products" | "orders" | "coupons" | "reviews";
type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  originalPrice: string;
  categoryId: string;
  stockQuantity: string;
  imageUrl: string;
  isFeatured: boolean;
  isActive: boolean;
};
const blankProduct: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  price: "",
  originalPrice: "",
  categoryId: "",
  stockQuantity: "0",
  imageUrl: "",
  isFeatured: false,
  isActive: true,
};
const orderStatuses = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const paymentStatuses = ["pending", "verified", "failed"] as const;

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#0A0A0A]">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
      </div>
    );
  if (!user)
    return (
      <AdminMessage
        icon={<ShieldAlert />}
        title="Admin access requires sign in"
        copy="Continue with the account that owns Nexus Drop to manage inventory and orders."
        action="Sign in"
        onAction={startLogin}
      />
    );
  if (user.role !== "admin")
    return (
      <AdminMessage
        icon={<ShieldAlert />}
        title="This account is not an admin"
        copy="Nexus Drop operations are restricted to the designated store administrator."
      />
    );
  return (
    <DashboardLayout>
      <AdminWorkspace />
    </DashboardLayout>
  );
}

function AdminWorkspace() {
  const reviewTabRequested =
    new URLSearchParams(window.location.search).get("tab") === "reviews";
  const [tab, setTab] = useState<Tab>(
    reviewTabRequested ? "reviews" : "overview"
  );
  const [reviewStatus, setReviewStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [verifiedFilter, setVerifiedFilter] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewFrom, setReviewFrom] = useState("");
  const [reviewTo, setReviewTo] = useState("");
  const [draft, setDraft] = useState<ProductDraft>(blankProduct);
  const [productModal, setProductModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponPercent, setCouponPercent] = useState("10");
  const [proofOrderId, setProofOrderId] = useState<string | null>(null);
  const [activityAdministrator, setActivityAdministrator] = useState("");
  const [activityAction, setActivityAction] = useState<
    "all" | "created" | "updated"
  >("all");
  const [activityFrom, setActivityFrom] = useState("");
  const [activityTo, setActivityTo] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [analyticsAttributionDays, setAnalyticsAttributionDays] = useState("7");
  const [analyticsProductId, setAnalyticsProductId] = useState("");
  const [analyticsCategoryId, setAnalyticsCategoryId] = useState("");
  const [failureType, setFailureType] = useState<"" | "provider" | "invalid_recipient" | "temporary" | "unknown">("");
  const [failureProductId, setFailureProductId] = useState("");
  const [selectedFailureIds, setSelectedFailureIds] = useState<string[]>([]);
  const utils = trpc.useUtils();
  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: analytics } = trpc.admin.analytics.useQuery({
    from: analyticsFrom || undefined,
    to: analyticsTo || undefined,
    attributionDays: Number(analyticsAttributionDays),
    productId: analyticsProductId || undefined,
    categoryId: analyticsCategoryId || undefined,
    failureType: failureType || undefined,
    failureProductId: failureProductId || undefined,
  });
  const { data: products } = trpc.admin.products.useQuery();
  const { data: orders } = trpc.admin.orders.useQuery();
  const { data: coupons } = trpc.admin.coupons.useQuery();
  const { data: reviews } = trpc.admin.reviews.useQuery({
    status: reviewStatus === "all" ? undefined : reviewStatus,
    verified:
      verifiedFilter === "all" ? undefined : verifiedFilter === "verified",
    search: reviewSearch || undefined,
    from: reviewFrom || undefined,
    to: reviewTo || undefined,
  });
  const { data: activity } = trpc.admin.productActivity.useQuery({
    limit: 50,
    page: activityPage,
    pageSize: 10,
    administrator: activityAdministrator || undefined,
    action: activityAction === "all" ? undefined : activityAction,
    from: activityFrom || undefined,
    to: activityTo || undefined,
  });
  const { data: categories } = trpc.store.categories.useQuery();
  const proof = trpc.admin.paymentProof.useQuery(
    { orderId: proofOrderId ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: Boolean(proofOrderId) }
  );
  const saveProduct = trpc.admin.saveProduct.useMutation({
    onSuccess: () => {
      toast.success("Product saved");
      setProductModal(false);
      setDraft(blankProduct);
      void utils.admin.products.invalidate();
      void utils.admin.productActivity.invalidate();
      void utils.store.catalog.invalidate();
    },
  });
  const uploadImage = trpc.admin.uploadProductImage.useMutation();
  const updateOrder = trpc.admin.updateOrder.useMutation({
    onSuccess: () => {
      toast.success("Order updated");
      void utils.admin.orders.invalidate();
      void utils.admin.stats.invalidate();
    },
  });
  const saveCoupon = trpc.admin.saveCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon saved");
      setCouponCode("");
      setCouponPercent("10");
      void utils.admin.coupons.invalidate();
    },
  });
  const moderateReview = trpc.admin.moderateReview.useMutation({
    onSuccess: () => {
      toast.success("Review moderation updated");
      void utils.admin.reviews.invalidate();
      void utils.store.reviews.invalidate();
      void utils.store.catalog.invalidate();
    },
  });

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await saveProduct.mutateAsync({
        id: draft.id,
        name: draft.name,
        slug: draft.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        description: draft.description,
        price: Number(draft.price),
        originalPrice: draft.originalPrice ? Number(draft.originalPrice) : null,
        categoryId: draft.categoryId,
        stockQuantity: Number(draft.stockQuantity),
        images: draft.imageUrl ? [draft.imageUrl] : [],
        isFeatured: draft.isFeatured,
        isActive: draft.isActive,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Product could not be saved."
      );
    }
  };
  const uploadProductImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const output = await uploadImage.mutateAsync({
          fileName: file.name,
          dataUrl: String(reader.result),
        });
        setDraft(current => ({ ...current, imageUrl: output.publicUrl }));
        toast.success("Product image uploaded");
      } catch {
        toast.error("Image could not be uploaded.");
      }
    };
    reader.readAsDataURL(file);
  };
  const editProduct = (product: NonNullable<typeof products>[number]) => {
    setDraft({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : "",
      categoryId: product.categoryId,
      stockQuantity: String(product.stockQuantity),
      imageUrl: product.images[0] ?? "",
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setProductModal(true);
  };
  const requestedEditId = new URLSearchParams(window.location.search).get(
    "edit"
  );
  useEffect(() => {
    if (requestedEditId && products?.length) {
      const requestedProduct = products.find(
        product => product.id === requestedEditId
      );
      if (requestedProduct) {
        setTab("products");
        editProduct(requestedProduct);
      }
    }
  }, [requestedEditId, products]);
  const deactivateProduct = (product: NonNullable<typeof products>[number]) => {
    saveProduct.mutate({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      categoryId: product.categoryId,
      stockQuantity: product.stockQuantity,
      images: product.images,
      isFeatured: product.isFeatured,
      isActive: false,
    });
  };
  const setAnalyticsRange = (range: "last7" | "this-month") => {
    const quickRange = getAnalyticsQuickRange(range);
    setAnalyticsFrom(quickRange.from);
    setAnalyticsTo(quickRange.to);
  };
  const setActivityRange = (range: "today" | "last7" | "last30") => {
    const quickRange = getAnalyticsQuickRange(range);
    setActivityFrom(quickRange.from);
    setActivityTo(quickRange.to);
    setActivityPage(1);
  };
  const exportActivity = () => {
    if (!activity?.items.length) {
      toast.error("There are no filtered activity records to export.");
      return;
    }
    const csv = buildActivityCsv(activity.items);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus-drop-activity-${activityFrom || "all-time"}-to-${activityTo || "today"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Filtered activity CSV downloaded");
  };
  const exportAnalytics = () => {
    if (!analytics) return;
    const csv = buildAnalyticsCsv(analytics);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus-drop-analytics-${analyticsFrom || "all-time"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics CSV downloaded");
  };

  return (
    <div className="min-h-full bg-[#0A0A0A] text-slate-100">
      <div className="mx-auto max-w-7xl p-4 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">
              Nexus Drop Operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">
              Admin workspace
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Monitor sales, manage inventory, and verify orders from one place.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            View storefront
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {(
            ["overview", "products", "orders", "coupons", "reviews"] as Tab[]
          ).map(item => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition ${tab === item ? "bg-cyan-400 text-[#061014]" : "border border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "overview" && (
          <Overview
            stats={stats}
            analytics={analytics}
            analyticsFrom={analyticsFrom}
            analyticsTo={analyticsTo}
            analyticsAttributionDays={analyticsAttributionDays}
            analyticsProductId={analyticsProductId}
            analyticsCategoryId={analyticsCategoryId}
            products={products ?? []}
            categories={categories ?? []}
            setAnalyticsAttributionDays={setAnalyticsAttributionDays}
            setAnalyticsProductId={setAnalyticsProductId}
            setAnalyticsCategoryId={setAnalyticsCategoryId}
            failureType={failureType}
            failureProductId={failureProductId}
            selectedFailureIds={selectedFailureIds}
            setFailureType={setFailureType}
            setFailureProductId={setFailureProductId}
            setSelectedFailureIds={setSelectedFailureIds}
            setAnalyticsFrom={setAnalyticsFrom}
            setAnalyticsTo={setAnalyticsTo}
            onQuickRange={setAnalyticsRange}
            onExport={exportAnalytics}
            orders={orders}
            activity={activity}
            activityAdministrator={activityAdministrator}
            activityAction={activityAction}
            activityFrom={activityFrom}
            activityTo={activityTo}
            setActivityAdministrator={value => {
              setActivityAdministrator(value);
              setActivityPage(1);
            }}
            setActivityAction={value => {
              setActivityAction(value);
              setActivityPage(1);
            }}
            setActivityFrom={value => {
              setActivityFrom(value);
              setActivityPage(1);
            }}
            setActivityTo={value => {
              setActivityTo(value);
              setActivityPage(1);
            }}
            activityPage={activityPage}
            setActivityPage={setActivityPage}
            onQuickActivityRange={setActivityRange}
            onClearActivityFilters={() => {
              setActivityAdministrator("");
              setActivityAction("all");
              setActivityFrom("");
              setActivityTo("");
              setActivityPage(1);
            }}
            onExportActivity={exportActivity}
            onViewOrders={() => setTab("orders")}
          />
        )}
        {tab === "products" && (
          <Products
            products={products}
            onAdd={() => {
              setDraft({
                ...blankProduct,
                categoryId: categories?.[0]?.id ?? "",
              });
              setProductModal(true);
            }}
            onEdit={editProduct}
            onDeactivate={deactivateProduct}
          />
        )}
        {tab === "orders" && (
          <Orders
            orders={orders}
            onUpdate={(id, orderStatus, paymentStatus) =>
              updateOrder.mutate({ id, orderStatus, paymentStatus })
            }
            onProof={setProofOrderId}
          />
        )}
        {tab === "coupons" && (
          <Coupons
            coupons={coupons}
            code={couponCode}
            percent={couponPercent}
            setCode={setCouponCode}
            setPercent={setCouponPercent}
            onSave={() =>
              saveCoupon.mutate({
                code: couponCode,
                discountPercent: Number(couponPercent),
                minSpend: 0,
                isActive: true,
              })
            }
            onToggle={coupon =>
              saveCoupon.mutate({
                id: coupon.id,
                code: coupon.code,
                discountPercent: coupon.discount_percent,
                minSpend: Number(coupon.min_spend),
                maxUses: coupon.max_uses,
                isActive: !coupon.is_active,
                expiryDate: coupon.expiry_date
                  ? new Date(coupon.expiry_date)
                  : null,
              })
            }
          />
        )}
        {tab === "reviews" && (
          <Reviews
            reviews={reviews}
            status={reviewStatus}
            verifiedFilter={verifiedFilter}
            search={reviewSearch}
            from={reviewFrom}
            to={reviewTo}
            setSearch={setReviewSearch}
            setFrom={setReviewFrom}
            setTo={setReviewTo}
            setStatus={setReviewStatus}
            setVerifiedFilter={setVerifiedFilter}
            onModerate={(id, status) =>
              moderateReview.mutate({ reviewId: id, status })
            }
          />
        )}
      </div>
      {productModal && (
        <ProductModal
          draft={draft}
          setDraft={setDraft}
          categories={categories ?? []}
          pending={saveProduct.isPending || uploadImage.isPending}
          onImage={uploadProductImage}
          onClose={() => setProductModal(false)}
          onSubmit={submitProduct}
        />
      )}
      {proofOrderId && (
        <ProofModal
          url={proof.data ?? null}
          loading={proof.isLoading}
          onClose={() => setProofOrderId(null)}
        />
      )}
    </div>
  );
}

function Overview({
  stats,
  analytics,
  analyticsFrom,
  analyticsTo,
  analyticsAttributionDays,
  analyticsProductId,
  analyticsCategoryId,
  products,
  categories,
  setAnalyticsAttributionDays,
  setAnalyticsProductId,
  setAnalyticsCategoryId,
  failureType,
  failureProductId,
  selectedFailureIds,
  setFailureType,
  setFailureProductId,
  setSelectedFailureIds,
  setAnalyticsFrom,
  setAnalyticsTo,
  onQuickRange,
  onExport,
  orders,
  activity,
  activityAdministrator,
  activityAction,
  activityFrom,
  activityTo,
  setActivityAdministrator,
  setActivityAction,
  setActivityFrom,
  setActivityTo,
  activityPage,
  setActivityPage,
  onQuickActivityRange,
  onClearActivityFilters,
  onExportActivity,
  onViewOrders,
}: {
  stats: any;
  analytics: any;
  analyticsFrom: string;
  analyticsTo: string;
  analyticsAttributionDays: string;
  analyticsProductId: string;
  analyticsCategoryId: string;
  products: any[];
  categories: any[];
  setAnalyticsAttributionDays: (value: string) => void;
  setAnalyticsProductId: (value: string) => void;
  setAnalyticsCategoryId: (value: string) => void;
  failureType: "" | "provider" | "invalid_recipient" | "temporary" | "unknown";
  failureProductId: string;
  selectedFailureIds: string[];
  setFailureType: (value: "" | "provider" | "invalid_recipient" | "temporary" | "unknown") => void;
  setFailureProductId: (value: string) => void;
  setSelectedFailureIds: (value: string[] | ((current: string[]) => string[])) => void;
  setAnalyticsFrom: (value: string) => void;
  setAnalyticsTo: (value: string) => void;
  onQuickRange: (range: "last7" | "this-month") => void;
  onExport: () => void;
  orders: any[] | undefined;
  activity:
    | {
        items: any[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }
    | undefined;
  activityAdministrator: string;
  activityAction: "all" | "created" | "updated";
  activityFrom: string;
  activityTo: string;
  setActivityAdministrator: (value: string) => void;
  setActivityAction: (value: "all" | "created" | "updated") => void;
  setActivityFrom: (value: string) => void;
  setActivityTo: (value: string) => void;
  activityPage: number;
  setActivityPage: (value: number) => void;
  onQuickActivityRange: (range: "today" | "last7" | "last30") => void;
  onClearActivityFilters: () => void;
  onExportActivity: () => void;
  onViewOrders: () => void;
}) {
  const cards = [
    {
      label: "Delivered revenue",
      value: formatNpr(stats?.revenue ?? 0),
      icon: <CircleDollarSign />,
    },
    {
      label: "Total orders",
      value: stats?.totalOrders ?? 0,
      icon: <ReceiptText />,
    },
    {
      label: "Pending delivery",
      value: stats?.pendingDeliveries ?? 0,
      icon: <Truck />,
    },
    {
      label: "Active inventory",
      value: stats?.activeInventory ?? 0,
      icon: <Package />,
    },
  ];
  const retryFailure = trpc.admin.retryRestockFailure.useMutation({ onSuccess: result => { toast.success(result.sent ? "Alert email retried successfully" : "Alert queued for retry"); }, onError: error => toast.error(error.message) });
  const retryFailures = trpc.admin.retryRestockFailures.useMutation({ onSuccess: result => { toast.success(`${result.sent} alert${result.sent === 1 ? "" : "s"} retried${result.skipped ? ` · ${result.skipped} skipped` : ""}`); setSelectedFailureIds([]); }, onError: error => toast.error(error.message) });
  return (
    <section className="mt-7">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#101821] p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.12em] text-cyan-300">
            Analytics window
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Filter conversion and wishlist saves by date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickRange("last7")}
            className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-bold text-slate-300 hover:border-cyan-300/40"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => onQuickRange("this-month")}
            className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-bold text-slate-300 hover:border-cyan-300/40"
          >
            This Month
          </button>
          <label className="text-xs text-slate-500">Attribution
            <select value={analyticsAttributionDays} onChange={event => setAnalyticsAttributionDays(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300"><option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
          </label>
          <select value={analyticsCategoryId} onChange={event => setAnalyticsCategoryId(event.target.value)} className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300" aria-label="Filter restock analytics by category"><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <select value={analyticsProductId} onChange={event => setAnalyticsProductId(event.target.value)} className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300" aria-label="Filter restock analytics by product"><option value="">All products</option>{products.filter(product => !analyticsCategoryId || product.category_id === analyticsCategoryId).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
          <label className="text-xs text-slate-500">
            From
            <input
              type="date"
              value={analyticsFrom}
              onChange={event => setAnalyticsFrom(event.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300"
            />
          </label>
          <label className="text-xs text-slate-500">
            To
            <input
              type="date"
              value={analyticsTo}
              onChange={event => setAnalyticsTo(event.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300"
            />
          </label>
          <button
            type="button"
            onClick={onExport}
            disabled={!analytics}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-[#061014] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/8 bg-[#101821] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-cyan-300">{card.icon}</span>
              <BarChart3 className="h-4 w-4 text-slate-700" />
            </div>
            <p className="mt-5 text-2xl font-black text-white">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[.1em] text-slate-500">
              {card.label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/8 bg-[#101821] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-black text-white">Order conversion</h2>
              <p className="mt-1 text-xs text-slate-500">
                Completed checkout flow over the last six months.
              </p>
            </div>
            <span className="text-2xl font-black text-cyan-300">
              {analytics?.conversionRate ?? 0}%
            </span>
          </div>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.monthly ?? []}>
                <CartesianGrid stroke="#ffffff12" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "#0f1720",
                    border: "1px solid #ffffff1a",
                    borderRadius: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ fill: "#22d3ee", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#101821] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-black text-white">Wishlist saves</h2>
              <p className="mt-1 text-xs text-slate-500">
                New saved items recorded by month.
              </p>
            </div>
            <span className="text-2xl font-black text-amber-300">
              {analytics?.totalWishlistSaves ?? 0}
            </span>
          </div>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={analytics?.monthly ?? []}>
                <CartesianGrid stroke="#ffffff12" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f1720",
                    border: "1px solid #ffffff1a",
                    borderRadius: 12,
                  }}
                />
                <Bar
                  dataKey="wishlistSaves"
                  fill="#fbbf24"
                  radius={[5, 5, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="mt-7 rounded-3xl border border-white/8 bg-[#101821] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-white">Top saved products</h2>
            <p className="mt-1 text-xs text-slate-500">
              Most frequently saved products in the selected window.
            </p>
          </div>
          <Heart className="h-5 w-5 text-amber-300" />
        </div>
        {analytics?.topSavedProducts?.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {analytics.topSavedProducts.map((product: any, index: number) => (
              <div
                key={product.id}
                className="rounded-2xl border border-white/8 bg-[#0A0A0A] p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-300/10 text-xs font-black text-amber-300">
                    {index + 1}
                  </span>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/5" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-amber-300">
                      {product.saves} saves
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No wishlist saves in this date range.
          </p>
        )}
      </div>
      <div className="mt-7 rounded-3xl border border-white/8 bg-[#101821] p-5">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-white">Restock performance</h2><p className="mt-1 text-xs text-slate-500">Alert signups and purchases after a customer receives a restock email.</p></div><BellRing className="h-5 w-5 text-cyan-300" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Alert signups", analytics?.restock?.totalAlertSignups ?? 0, "text-cyan-300"], ["Sent alerts", analytics?.restock?.sentAlerts ?? 0, "text-white"], ["Cancelled", analytics?.restock?.cancelledAlerts ?? 0, "text-slate-400"], ["Converted", analytics?.restock?.convertedAlerts ?? 0, "text-emerald-300"], ["Restock conversion", `${analytics?.restock?.conversionRate ?? 0}%`, "text-amber-300"]].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-white/8 bg-[#0A0A0A] p-3"><p className={`text-xl font-black ${color}`}>{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.1em] text-slate-500">{label}</p></div>)}</div>
        <div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%"><RechartsBarChart data={analytics?.restock?.monthly ?? []}><CartesianGrid stroke="#ffffff12" vertical={false} /><XAxis dataKey="label" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} allowDecimals={false} /><Tooltip contentStyle={{ background: "#0f1720", border: "1px solid #ffffff1a", borderRadius: 12 }} /><Bar dataKey="alertSignups" fill="#22d3ee" radius={[5, 5, 0, 0]} /><Bar dataKey="convertedAlerts" fill="#34d399" radius={[5, 5, 0, 0]} /></RechartsBarChart></ResponsiveContainer></div>
        <div className="mt-5 rounded-2xl border border-white/8 bg-[#0A0A0A] p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-white">Attribution comparison</h3><p className="mt-1 text-xs text-slate-500">How conversion changes as the post-email window expands.</p></div><span className="text-xs font-bold text-cyan-300">Selected: {analytics?.restock?.attributionDays ?? 7} days</span></div><div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics?.restock?.attributionComparison ?? []}><CartesianGrid stroke="#ffffff12" vertical={false} /><XAxis dataKey="label" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} unit="%" /><Tooltip contentStyle={{ background: "#0f1720", border: "1px solid #ffffff1a", borderRadius: 12 }} /><Line type="monotone" dataKey="conversionRate" stroke="#fbbf24" strokeWidth={3} dot={{ fill: "#fbbf24", r: 3 }} /></LineChart></ResponsiveContainer></div></div>
        {analytics?.restock?.topRestockProducts?.length ? <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{analytics.restock.topRestockProducts.map((product: any) => <div key={product.id} className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3"><p className="truncate text-sm font-bold text-white">{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.signups} signups · {product.converted} converted</p></div>)}</div> : <p className="mt-5 text-sm text-slate-500">No restock alerts in this date range.</p>}
      </div>
      <div className="mt-7 rounded-3xl border border-red-300/15 bg-[#101821] p-5">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-white">Email delivery failures</h2><p className="mt-1 text-xs text-slate-500">Bounced or undelivered back-in-stock alerts in the selected window.</p></div><ShieldAlert className="h-5 w-5 text-red-300" /></div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><select value={failureType} onChange={event => setFailureType(event.target.value as typeof failureType)} className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300" aria-label="Filter delivery failure type"><option value="">All error types</option><option value="provider">Provider / bounce</option><option value="invalid_recipient">Invalid recipient</option><option value="temporary">Temporary failure</option><option value="unknown">Unknown</option></select><select value={failureProductId} onChange={event => setFailureProductId(event.target.value)} className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300" aria-label="Filter delivery failures by product"><option value="">All failed products</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><button type="button" onClick={() => setSelectedFailureIds((analytics?.restockFailures ?? []).map((failure: any) => failure.id))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-cyan-300/40">Select visible</button><button type="button" disabled={!selectedFailureIds.length || retryFailures.isPending} onClick={() => retryFailures.mutate({ requestIds: selectedFailureIds })} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-black text-[#061014] disabled:opacity-50">Retry selected ({selectedFailureIds.length})</button></div>
        {analytics?.restockFailures?.length ? <div className="mt-4 divide-y divide-white/8">{analytics.restockFailures.map((failure: any) => <div key={failure.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><input type="checkbox" checked={selectedFailureIds.includes(failure.id)} onChange={event => setSelectedFailureIds(current => event.target.checked ? [...current, failure.id] : current.filter(id => id !== failure.id))} aria-label={`Select failed alert for ${failure.productName}`} className="h-4 w-4 accent-cyan-400" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-white">{failure.productName}</p><span className="rounded-full bg-red-300/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-300">{failure.errorType}</span></div><p className="mt-1 text-xs text-slate-500">{failure.email}{failure.categoryName ? ` · ${failure.categoryName}` : ""}</p><p className="mt-1 text-xs text-red-300">{failure.error}</p></div><button type="button" disabled={retryFailure.isPending} onClick={() => retryFailure.mutate({ requestId: failure.id })} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-300/10 disabled:opacity-50">Retry delivery</button></div>)}</div> : <p className="mt-4 text-sm text-emerald-300">No failed alert deliveries in this date range.</p>}
      </div>
      <div className="mt-7 rounded-3xl border border-white/8 bg-[#101821] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-black text-white">Recent catalog activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent product creates, edits, and archive changes.
            </p>
          </div>
          <Activity className="hidden h-5 w-5 text-cyan-300 lg:block" />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[.12em] text-slate-500">
            Filter activity date range and ownership
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => onQuickActivityRange("today")} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:border-cyan-300/40">Today</button>
            <button type="button" onClick={() => onQuickActivityRange("last7")} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:border-cyan-300/40">Last 7 Days</button>
            <button type="button" onClick={() => onQuickActivityRange("last30")} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:border-cyan-300/40">Last 30 Days</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={activityAdministrator}
              onChange={event => setActivityAdministrator(event.target.value)}
              placeholder="Administrator"
              aria-label="Filter by administrator"
              className="rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-300/50"
            />
            <select
              value={activityAction}
              onChange={event =>
                setActivityAction(event.target.value as typeof activityAction)
              }
              aria-label="Filter by action"
              className="rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-slate-300"
            >
              <option value="all">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-slate-500">
              From
              <input
                type="date"
                value={activityFrom}
                onChange={event => setActivityFrom(event.target.value)}
                className="min-w-0 bg-transparent text-xs text-slate-300 outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-slate-500">
              To
              <input
                type="date"
                value={activityTo}
                onChange={event => setActivityTo(event.target.value)}
                className="min-w-0 bg-transparent text-xs text-slate-300 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={onClearActivityFilters}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-300/40"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={onExportActivity}
              disabled={!activity?.items.length}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-[#061014] disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export filtered CSV
            </button>
          </div>
        </div>
        {activity?.items?.length ? (
          <div className="mt-4 divide-y divide-white/8">
            {activity.items.map((entry: any) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  {entry.productId ? (
                    <Link
                      href={`/admin?tab=products&edit=${entry.productId}`}
                      className="block font-bold text-white hover:text-cyan-300"
                    >
                      <span className="capitalize text-cyan-300">
                        {entry.action}
                      </span>{" "}
                      · {entry.productName}
                    </Link>
                  ) : (
                    <p className="font-bold text-white">
                      <span className="capitalize text-cyan-300">
                        {entry.action}
                      </span>{" "}
                      · {entry.productName}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.adminName} · {formatDate(entry.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs text-slate-400">
                  {entry.changes?.isActive === false
                    ? "Archived"
                    : entry.changes?.stockQuantity !== undefined
                      ? `${entry.changes.stockQuantity} in stock`
                      : "Catalog change"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            No catalog changes have been recorded yet.
          </p>
        )}
        {activity && (
          <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4 text-xs text-slate-500">
            <span>
              {activity.total
                ? `Showing ${(activity.page - 1) * activity.pageSize + 1}–${Math.min(activity.page * activity.pageSize, activity.total)} of ${activity.total}`
                : "No results"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                disabled={activityPage <= 1}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 font-bold text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {activity.page} / {activity.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setActivityPage(
                    Math.min(activity.totalPages, activityPage + 1)
                  )
                }
                disabled={activityPage >= activity.totalPages}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 font-bold text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-7 rounded-3xl border border-white/8 bg-[#101821] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-white">Recent orders</h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest customer orders awaiting action.
            </p>
          </div>
          <button
            onClick={onViewOrders}
            className="text-sm font-bold text-cyan-300"
          >
            Open orders
          </button>
        </div>
        {orders?.length ? (
          <div className="mt-5 divide-y divide-white/8">
            {orders.slice(0, 4).map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-white">{order.order_number}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.customer_name} · {order.payment_method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">
                    {formatNpr(Number(order.total_amount))}
                  </p>
                  <p className="mt-1 text-xs capitalize text-cyan-300">
                    {order.order_status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            No orders have been placed yet.
          </p>
        )}
      </div>
    </section>
  );
}
function Products({
  products,
  onAdd,
  onEdit,
  onDeactivate,
}: {
  products: any[] | undefined;
  onAdd: () => void;
  onEdit: (product: any) => void;
  onDeactivate: (product: any) => void;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Product catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit, or archive storefront inventory.
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-[#061014]"
        >
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {products?.map(product => (
          <article
            key={product.id}
            className="flex gap-4 rounded-2xl border border-white/8 bg-[#101821] p-4"
          >
            <img
              src={
                product.images[0] || "/manus-storage/hero-gadgets_4fcc5ee6.jpeg"
              }
              alt=""
              className="h-20 w-20 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {product.categoryName} · {product.stockQuantity} in stock
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${product.isActive ? "bg-cyan-300/10 text-cyan-300" : "bg-slate-700 text-slate-300"}`}
                >
                  {product.isActive ? "Live" : "Archived"}
                </span>
              </div>
              <p className="mt-2 text-sm font-black text-white">
                {formatNpr(product.price)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onEdit(product)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-cyan-300/40"
                >
                  Edit
                </button>
                {product.isActive && (
                  <button
                    onClick={() => onDeactivate(product)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-400 hover:border-red-300/40 hover:text-red-300"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
function Orders({
  orders,
  onUpdate,
  onProof,
}: {
  orders: any[] | undefined;
  onUpdate: (id: string, orderStatus: any, paymentStatus: any) => void;
  onProof: (id: string) => void;
}) {
  return (
    <section className="mt-7">
      <h2 className="text-xl font-black text-white">Order manager</h2>
      <p className="mt-1 text-sm text-slate-500">
        Confirm payment, update delivery, and inspect customer receipts.
      </p>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-white/8 bg-[#101821]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/8 text-xs uppercase tracking-[.1em] text-slate-500">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Delivery</th>
              <th className="p-4">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {orders?.map(order => (
              <tr key={order.id}>
                <td className="p-4">
                  <p className="font-bold text-white">{order.order_number}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(order.created_at)}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-bold text-white">{order.customer_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.customer_phone}
                  </p>
                </td>
                <td className="p-4 font-bold text-white">
                  {formatNpr(Number(order.total_amount))}
                </td>
                <td className="p-4">
                  <select
                    value={order.payment_status}
                    onChange={event =>
                      onUpdate(order.id, order.order_status, event.target.value)
                    }
                    className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs text-slate-300"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="failed">Failed</option>
                  </select>
                </td>
                <td className="p-4">
                  <select
                    value={order.order_status}
                    onChange={event =>
                      onUpdate(
                        order.id,
                        event.target.value,
                        order.payment_status
                      )
                    }
                    className="rounded-lg border border-white/10 bg-[#0A0A0A] px-2 py-1.5 text-xs capitalize text-slate-300"
                  >
                    {orderStatuses.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  {order.payment_proof_url ? (
                    <button
                      onClick={() => onProof(order.id)}
                      className="text-xs font-bold text-cyan-300"
                    >
                      View proof
                    </button>
                  ) : (
                    <span className="text-xs text-slate-600">Not required</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Reviews({
  reviews,
  status,
  verifiedFilter,
  search,
  from,
  to,
  setSearch,
  setFrom,
  setTo,
  setStatus,
  setVerifiedFilter,
  onModerate,
}: {
  reviews: any[] | undefined;
  status: "all" | "pending" | "approved" | "rejected";
  verifiedFilter: "all" | "verified" | "unverified";
  search: string;
  from: string;
  to: string;
  setSearch: (value: string) => void;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  setStatus: (value: "all" | "pending" | "approved" | "rejected") => void;
  setVerifiedFilter: (value: "all" | "verified" | "unverified") => void;
  onModerate: (id: string, status: "pending" | "approved" | "rejected") => void;
}) {
  const controlsPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("qa") === "controls";
  return (
    <section className="mt-7">
      <div>
        <h2 className="text-xl font-black text-white">Review moderation</h2>
        <p className="mt-1 text-sm text-slate-500">
          Approve honest customer feedback, reject abuse, and preserve a clear
          trust signal.
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search product, customer, or review"
          className="rounded-xl border border-white/10 bg-[#101821] px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-300/50 lg:col-span-2"
        />
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101821] px-3 py-2 text-xs text-slate-500">
          From
          <input
            type="date"
            value={from}
            onChange={event => setFrom(event.target.value)}
            className="min-w-0 bg-transparent text-sm text-slate-300 outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101821] px-3 py-2 text-xs text-slate-500">
          To
          <input
            type="date"
            value={to}
            onChange={event => setTo(event.target.value)}
            className="min-w-0 bg-transparent text-sm text-slate-300 outline-none"
          />
        </label>
        <select
          value={status}
          onChange={event => setStatus(event.target.value as typeof status)}
          className="rounded-xl border border-white/10 bg-[#101821] px-3 py-2 text-sm text-slate-300"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={event =>
            setVerifiedFilter(event.target.value as typeof verifiedFilter)
          }
          className="rounded-xl border border-white/10 bg-[#101821] px-3 py-2 text-sm text-slate-300"
        >
          <option value="all">All purchase states</option>
          <option value="verified">Verified purchase</option>
          <option value="unverified">Unverified purchase</option>
        </select>
      </div>
      <div className="mt-6 space-y-4">
        {controlsPreview && !reviews?.length && (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
            <p className="text-xs font-black uppercase tracking-[.12em] text-cyan-300">
              Controls preview — no customer data
            </p>
            <p className="mt-2 text-sm text-slate-400">
              These actions appear on real submitted review rows. No review
              content is shown or created for this preview.
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#101821] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">
                      Product name from review
                    </span>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.1em] text-amber-300">
                      pending
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.1em] text-slate-500">
                      purchase status computed
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Review text and customer identity are intentionally redacted
                    in this no-data preview.
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Profile · rating · created date · verified-purchase flag
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-[#061014] opacity-80"
                  >
                    Approve
                  </button>
                  <button
                    disabled
                    className="rounded-lg border border-red-300/30 px-3 py-2 text-xs font-bold text-red-300 opacity-80"
                  >
                    Reject
                  </button>
                  <button
                    disabled
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 opacity-80"
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {reviews?.length ? (
          reviews.map(review => (
            <article
              key={review.id}
              className="rounded-2xl border border-white/8 bg-[#101821] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white">
                      {review.products?.name ?? "Unknown product"}
                    </p>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.1em] text-slate-400">
                      {review.moderation_status}
                    </span>
                    {review.verified_purchase && (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.1em] text-cyan-300">
                        Verified purchase
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {review.comment}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {review.profiles?.full_name ?? "Customer"} · {review.rating}
                    /5 · {new Date(review.created_at).toLocaleDateString()}
                  </p>
                  {review.review_moderation_history?.length ? (
                    <div className="mt-3 border-t border-white/8 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-600">
                        Moderation history
                      </p>
                      <div className="mt-2 space-y-1">
                        {review.review_moderation_history
                          .slice(0, 5)
                          .map((entry: any) => (
                            <p
                              key={entry.id}
                              className="text-xs text-slate-500"
                            >
                              {entry.from_status ?? "new"} → {entry.to_status} ·{" "}
                              {new Date(entry.created_at).toLocaleDateString()}
                              {entry.note ? ` · ${entry.note}` : ""}
                            </p>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => onModerate(review.id, "approved")}
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-[#061014]"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onModerate(review.id, "rejected")}
                    className="rounded-lg border border-red-300/30 px-3 py-2 text-xs font-bold text-red-300"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => onModerate(review.id, "pending")}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-400"
                  >
                    Pending
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.02] p-8 text-center text-sm text-slate-500">
            No customer reviews have been submitted yet.
          </div>
        )}
      </div>
    </section>
  );
}

function Coupons({
  coupons,
  code,
  percent,
  setCode,
  setPercent,
  onSave,
  onToggle,
}: {
  coupons: any[] | undefined;
  code: string;
  percent: string;
  setCode: (value: string) => void;
  setPercent: (value: string) => void;
  onSave: () => void;
  onToggle: (coupon: any) => void;
}) {
  return (
    <section className="mt-7 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSave();
        }}
        className="rounded-3xl border border-white/8 bg-[#101821] p-6"
      >
        <div className="flex items-center gap-3">
          <Tag className="h-5 w-5 text-cyan-300" />
          <h2 className="font-black text-white">Create promotion</h2>
        </div>
        <label className="mt-6 block text-sm font-bold text-slate-300">
          Coupon code
          <input
            required
            value={code}
            onChange={event => setCode(event.target.value.toUpperCase())}
            placeholder="NEXUS10"
            className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-300">
          Discount percentage
          <input
            required
            min="1"
            max="30"
            type="number"
            value={percent}
            onChange={event => setPercent(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
        <button className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#061014]">
          Save coupon
        </button>
      </form>
      <div className="rounded-3xl border border-white/8 bg-[#101821] p-6">
        <h2 className="font-black text-white">Active promotions</h2>
        <div className="mt-5 divide-y divide-white/8">
          {coupons?.map(coupon => (
            <div
              key={coupon.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="font-bold text-white">{coupon.code}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {coupon.discount_percent}% off · used {coupon.current_uses}{" "}
                  time(s)
                </p>
              </div>
              <button
                onClick={() => onToggle(coupon)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${coupon.is_active ? "bg-cyan-300/10 text-cyan-300" : "bg-slate-700 text-slate-300"}`}
              >
                {coupon.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function ProductModal({
  draft,
  setDraft,
  categories,
  pending,
  onImage,
  onClose,
  onSubmit,
}: {
  draft: ProductDraft;
  setDraft: (
    value: ProductDraft | ((current: ProductDraft) => ProductDraft)
  ) => void;
  categories: any[];
  pending: boolean;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const change = (key: keyof ProductDraft, value: string | boolean) =>
    setDraft(current => ({ ...current, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#101821] p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-cyan-300">
              Catalog editor
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              {draft.id ? "Edit product" : "Add product"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <AdminField
            label="Product name"
            value={draft.name}
            onChange={value => change("name", value)}
            required
          />
          <AdminField
            label="URL slug"
            value={draft.slug}
            onChange={value => change("slug", value)}
            required
          />
          <AdminField
            label="Price (NPR)"
            type="number"
            value={draft.price}
            onChange={value => change("price", value)}
            required
          />
          <AdminField
            label="Original price (optional)"
            type="number"
            value={draft.originalPrice}
            onChange={value => change("originalPrice", value)}
          />
          <AdminField
            label="Stock quantity"
            type="number"
            value={draft.stockQuantity}
            onChange={value => change("stockQuantity", value)}
            required
          />
          <label className="text-sm font-bold text-slate-300">
            Category
            <select
              required
              value={draft.categoryId}
              onChange={event => change("categoryId", event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 text-sm font-normal text-white outline-none focus:border-cyan-300/50"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-300">
            Description
            <textarea
              required
              minLength={10}
              value={draft.description}
              onChange={event => change("description", event.target.value)}
              className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-3 text-sm font-normal text-white outline-none focus:border-cyan-300/50"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-300">
            Product image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImage}
              className="mt-2 block w-full text-xs font-normal text-slate-400"
            />
            {draft.imageUrl && (
              <img
                src={draft.imageUrl}
                alt="Product preview"
                className="mt-3 h-24 w-24 rounded-xl object-cover"
              />
            )}
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.isFeatured}
              onChange={event => change("isFeatured", event.target.checked)}
            />
            Featured drop
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={event => change("isActive", event.target.checked)}
            />
            Visible on storefront
          </label>
        </div>
        <button
          disabled={pending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-[#061014] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Save product
        </button>
      </form>
    </div>
  );
}
function AdminField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold text-slate-300">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-3 text-sm font-normal text-white outline-none focus:border-cyan-300/50"
      />
    </label>
  );
}
function ProofModal({
  url,
  loading,
  onClose,
}: {
  url: string | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#101821] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white">Payment proof</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <div className="grid h-64 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          </div>
        ) : url ? (
          <img
            src={url}
            alt="Customer payment receipt"
            className="mt-5 max-h-[70vh] w-full rounded-xl object-contain"
          />
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            This receipt is not available.
          </p>
        )}
      </div>
    </div>
  );
}
function AdminMessage({
  icon,
  title,
  copy,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0A0A0A] p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300">
          {icon}
        </div>
        <h1 className="mt-5 text-3xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
        {action && onAction && (
          <button
            onClick={onAction}
            className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]"
          >
            {action}
          </button>
        )}
        <Link href="/" className="mt-5 block text-sm font-bold text-cyan-300">
          Back to storefront
        </Link>
      </div>
    </div>
  );
}
