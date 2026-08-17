import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabaseAuth } from "@/lib/supabase";
import { isValidCustomerEmail, isValidCustomerOtp, normalizeCustomerEmail } from "@/lib/customerOtp";

type CustomerAuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
};

export default function CustomerAuthDialog({ open, onOpenChange, onAuthenticated }: CustomerAuthDialogProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const sendOtp = async () => {
    const normalizedEmail = normalizeCustomerEmail(email);
    if (!isValidCustomerEmail(normalizedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setPending(true);
    const { error } = await supabaseAuth.auth.signInWithOtp({ email: normalizedEmail, options: { shouldCreateUser: true } });
    setPending(false);
    if (error) {
      toast.error(error.message || "Could not send your login code.");
      return;
    }
    setEmail(normalizedEmail);
    setOtp("");
    setStep("otp");
    setSecondsLeft(60);
    toast.success("Your one-time code was sent by email.");
  };

  const verifyOtp = async () => {
    if (!isValidCustomerOtp(otp)) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setPending(true);
    const { data, error } = await supabaseAuth.auth.verifyOtp({ email, token: otp.trim(), type: "email" });
    if (error || !data.session) {
      setPending(false);
      toast.error(error?.message || "That code is invalid or expired.");
      return;
    }

    const response = await fetch("/api/auth/supabase-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    setPending(false);
    if (!response.ok) {
      toast.error("Your code was verified, but the store session could not be created.");
      return;
    }

    onOpenChange(false);
    toast.success("You are signed in.");
    onAuthenticated();
  };

  const reset = () => {
    setStep("email");
    setOtp("");
    setSecondsLeft(0);
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!value) reset(); onOpenChange(value); }}>
      <DialogContent className="border-white/10 bg-[#101821] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-cyan-300" /> Customer login</DialogTitle>
          <DialogDescription className="text-slate-400">Use a one-time email code. New customers are created automatically with customer access.</DialogDescription>
        </DialogHeader>
        {step === "email" ? (
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); void sendOtp(); }}>
            <Input autoFocus required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="border-white/10 bg-black/20 text-white" />
            <Button type="submit" disabled={pending} className="w-full bg-cyan-400 font-black text-[#061014] hover:bg-cyan-300">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send one-time code"}</Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); void verifyOtp(); }}>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">Code sent to <strong>{email}</strong></div>
            <Input autoFocus required inputMode="numeric" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" className="border-white/10 bg-black/20 text-center text-lg tracking-[0.45em] text-white" />
            <Button type="submit" disabled={pending} className="w-full bg-cyan-400 font-black text-[#061014] hover:bg-cyan-300">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="mr-2 h-4 w-4" /> Verify and continue</>}</Button>
            <div className="flex items-center justify-between text-xs text-slate-500"><button type="button" onClick={reset} className="hover:text-cyan-300">Use another email</button><button type="button" disabled={secondsLeft > 0 || pending} onClick={() => void sendOtp()} className="hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{secondsLeft ? `Resend in ${secondsLeft}s` : "Resend code"}</button></div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
