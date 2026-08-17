import { useEffect, useState } from "react";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  isDefault: boolean;
};

type AddressForm = Omit<Address, "id" | "isDefault"> & { isDefault: boolean };
const emptyForm: AddressForm = { label: "Home", fullName: "", phone: "", addressLine: "", city: "", isDefault: true };

function AddressFields({ value, onChange }: { value: AddressForm; onChange: (next: AddressForm) => void }) {
  const update = (key: keyof AddressForm, fieldValue: string | boolean) => onChange({ ...value, [key]: fieldValue });
  return <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Label<Input className="mt-1 border-white/10 bg-black/20 text-white" value={value.label} onChange={event => update("label", event.target.value)} placeholder="Home" /></label><label className="text-xs font-bold text-slate-400">Full name<Input className="mt-1 border-white/10 bg-black/20 text-white" value={value.fullName} onChange={event => update("fullName", event.target.value)} placeholder="Recipient name" /></label><label className="text-xs font-bold text-slate-400">Phone<Input className="mt-1 border-white/10 bg-black/20 text-white" value={value.phone} onChange={event => update("phone", event.target.value)} placeholder="+977 98XXXXXXXX" /></label><label className="text-xs font-bold text-slate-400">City / town<Input className="mt-1 border-white/10 bg-black/20 text-white" value={value.city} onChange={event => update("city", event.target.value)} placeholder="Nepalgunj" /></label><label className="text-xs font-bold text-slate-400 sm:col-span-2">Address<Input className="mt-1 border-white/10 bg-black/20 text-white" value={value.addressLine} onChange={event => update("addressLine", event.target.value)} placeholder="House, ward, street / landmark" /></label><label className="flex items-center gap-2 text-xs font-bold text-slate-400 sm:col-span-2"><input type="checkbox" checked={value.isDefault} onChange={event => update("isDefault", event.target.checked)} className="h-4 w-4 accent-cyan-300" />Use as default address</label></div>;
}

export function AddressBook() {
  const utils = trpc.useUtils();
  const { data: addresses, isLoading } = trpc.store.customerAddresses.useQuery();
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const create = trpc.store.createCustomerAddress.useMutation({ onSuccess: () => { toast.success("Address saved"); setForm(emptyForm); void utils.store.customerAddresses.invalidate(); }, onError: error => toast.error(error.message) });
  const update = trpc.store.updateCustomerAddress.useMutation({ onSuccess: () => { toast.success("Address updated"); setEditingId(null); setForm(emptyForm); void utils.store.customerAddresses.invalidate(); }, onError: error => toast.error(error.message) });
  const remove = trpc.store.deleteCustomerAddress.useMutation({ onSuccess: () => { toast.success("Address removed"); void utils.store.customerAddresses.invalidate(); }, onError: error => toast.error(error.message) });
  const setDefault = trpc.store.setDefaultCustomerAddress.useMutation({ onSuccess: () => { toast.success("Default address updated"); void utils.store.customerAddresses.invalidate(); }, onError: error => toast.error(error.message) });
  const pending = create.isPending || update.isPending || remove.isPending || setDefault.isPending;
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (editingId) update.mutate({ addressId: editingId, data: form }); else create.mutate(form); };
  const startEdit = (address: Address) => { setEditingId(address.id); setForm({ label: address.label, fullName: address.fullName, phone: address.phone, addressLine: address.addressLine, city: address.city, isDefault: address.isDefault }); };
  return <section className="rounded-3xl border border-white/8 bg-[#101821] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-cyan-300" /><h2 className="font-black text-white">Saved shipping addresses</h2></div><p className="mt-2 text-sm text-slate-500">Keep delivery details ready for your next checkout.</p></div>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-slate-500 hover:text-white" aria-label="Cancel address edit"><X className="h-5 w-5" /></button>}</div><div className="mt-5 grid gap-3 md:grid-cols-2">{isLoading ? <p className="text-sm text-slate-500">Loading addresses…</p> : addresses?.length ? addresses.map(address => <div key={address.id} className={`rounded-2xl border p-4 ${address.isDefault ? "border-cyan-300/50 bg-cyan-300/[.06]" : "border-white/8 bg-black/15"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{address.label} {address.isDefault && <span className="ml-1 text-[10px] uppercase tracking-[.12em] text-cyan-300">Default</span>}</p><p className="mt-2 text-sm text-slate-300">{address.fullName} · {address.phone}</p><p className="mt-1 text-sm text-slate-500">{address.addressLine}, {address.city}</p></div><div className="flex gap-1"><button type="button" onClick={() => startEdit(address)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-cyan-300" aria-label={`Edit ${address.label}`}><Pencil className="h-4 w-4" /></button><button type="button" disabled={pending} onClick={() => remove.mutate({ addressId: address.id })} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-red-300 disabled:opacity-50" aria-label={`Delete ${address.label}`}><Trash2 className="h-4 w-4" /></button></div></div>{!address.isDefault && <button type="button" disabled={pending} onClick={() => setDefault.mutate({ addressId: address.id })} className="mt-3 text-xs font-bold text-cyan-300 hover:text-cyan-200 disabled:opacity-50">Make default</button>}</div>) : <p className="text-sm text-slate-500">No saved addresses yet.</p>}</div><form onSubmit={submit} className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/10 p-4"><p className="mb-4 flex items-center gap-2 text-sm font-black text-white">{editingId ? <Pencil className="h-4 w-4 text-cyan-300" /> : <Plus className="h-4 w-4 text-cyan-300" />}{editingId ? "Edit address" : "Add an address"}</p><AddressFields value={form} onChange={setForm} /><Button type="submit" disabled={pending} className="mt-4 bg-cyan-400 font-black text-[#061014] hover:bg-cyan-300">{editingId ? "Update address" : "Save address"}</Button></form></section>;
}

export function SavedAddressPicker({ onSelect }: { onSelect: (address: Address) => void }) {
  const { user } = useAuth();
  const { data: addresses, isLoading } = trpc.store.customerAddresses.useQuery(undefined, { enabled: Boolean(user), retry: false });
  useEffect(() => { const defaultAddress = addresses?.find(address => address.isDefault) ?? addresses?.[0]; if (defaultAddress) onSelect(defaultAddress); }, [addresses, onSelect]);
  if (isLoading || !addresses?.length) return null;
  return <div className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-cyan-300">Use a saved address</p><div className="mt-3 flex flex-wrap gap-2">{addresses.map(address => <button type="button" key={address.id} onClick={() => onSelect(address)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-left text-xs font-bold text-slate-300 hover:border-cyan-300/50 hover:text-white"><Check className={`h-3.5 w-3.5 ${address.isDefault ? "text-cyan-300" : "text-slate-600"}`} />{address.label}</button>)}</div></div>;
}
