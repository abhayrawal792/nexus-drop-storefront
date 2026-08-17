import { useState } from "react";
import { Loader2, UserRoundCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import CustomerAuthDialog from "@/components/storefront/CustomerAuthDialog";
import { EmailPreferencesPanel, SettingsHeader } from "@/components/storefront/CustomerAlertSettings";

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  if (loading) return <main className="container grid min-h-[500px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></main>;
  if (!user) return <><main className="container grid min-h-[540px] place-items-center py-16"><div className="max-w-md text-center"><UserRoundCheck className="mx-auto h-11 w-11 text-cyan-300" /><h1 className="mt-5 text-3xl font-black text-white">Sign in to manage settings.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Your email preferences are private to your customer account.</p><button type="button" onClick={() => setAuthOpen(true)} className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-[#061014]">Login / Create account</button></div></main><CustomerAuthDialog open={authOpen} onOpenChange={setAuthOpen} onAuthenticated={() => window.location.reload()} /></>;
  return <main className="container py-10 sm:py-14"><SettingsHeader /><div className="mt-6 border-b border-white/8 pb-7"><p className="text-xs font-black uppercase tracking-[.17em] text-cyan-300">Customer settings</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] text-white">Control your alerts.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Choose whether Nexus Drop can send you back-in-stock emails. Turning alerts off also removes your active alert requests.</p></div><div className="mt-8 max-w-2xl"><EmailPreferencesPanel /><Link href="/account" className="mt-5 inline-flex text-sm font-bold text-cyan-300 hover:text-cyan-200">Return to dashboard</Link></div></main>;
}
