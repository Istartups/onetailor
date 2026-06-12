import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, UserPlus, Search, Ruler, X, Edit2, Trash2,
  ChevronRight, Contact, Plus, LayoutGrid, CheckCircle2,
  Phone, Mail, MapPin, Crown, ShieldCheck,
  ChevronDown, ChevronUp, MessageCircle, ExternalLink,
  Layers, RefreshCw, SlidersHorizontal, NotebookPen, Pin, Archive, RotateCcw, ChevronLeft
} from "lucide-react";
import { SYSTEM_TEMPLATES_META } from "@/lib/measurement-data";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDeviceId, validateName, validatePhone } from "@/lib/utils";

// ─── (System templates loaded from shared lib) ────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

type Gender = "male" | "female" | "others";

interface Customer {
  id: number;
  name: string;
  phone: string;
  gender: Gender;
  email?: string;
  address?: string;
  notes?: string;
  updatedAt: string;
}

interface Measurement {
  id: number;
  customerId: number;
  label: string;
  category: string;
  values: string;
  createdAt: string;
}

type View =
  | "clients"
  | "client_detail"
  | "add_client"
  | "edit_client"
  | "add_measurement"
  | "edit_measurement"
  | "measurement_cards";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerMeasurement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const isPremium           = useAppStore(s => s.isPremium);
  const measurementLimit    = useAppStore(s => s.measurementLimit);
  const proUpgradeMessage   = useAppStore(s => s.proUpgradeMessage);
  const proUpgradeLink      = useAppStore(s => s.proUpgradeLink);
  const proUpgradeButtonText = useAppStore(s => s.proUpgradeButtonText);
  const customTemplates          = useAppStore(s => s.customTemplates);
  const customMeasurementFields  = useAppStore(s => s.customMeasurementFields);
  const addCustomMeasurementField = useAppStore(s => s.addCustomMeasurementField);

  // ── UI state ──
  const [view, setView]               = useState<View>("clients");
  const [loading, setLoading]         = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [genderFilter, setGenderFilter]     = useState<"all" | Gender>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // ── Data state ──
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements]   = useState<Measurement[]>([]);

  // ── Detail tab ──
  const [detailTab, setDetailTab] = useState<"measurements" | "notes">("measurements");

  // ── Customer notes ──
  interface CustomerNote { id: number; title: string; content: string; tags: string | null; isPinned: boolean; isArchived: boolean; updatedAt: string; }
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [noteForm, setNoteForm] = useState({ show: false, title: "", content: "", tags: "" });
  const [noteSaving, setNoteSaving] = useState(false);

  // ── Client form ──
  const [customerForm, setCustomerForm] = useState({
    name: "", phone: "", gender: "male" as Gender, email: "", address: "", notes: ""
  });

  // ── Measurement form ──
  const [measurementForm, setMeasurementForm] = useState({
    id: undefined as number | undefined,
    label: "Initial Measurement",
    category: "",
    unit: "Inches" as "Inches" | "CM",
    values: {} as Record<string, string>,
    customFields: [] as { name: string; value: string }[]
  });

  // ── Post-save "add measurement?" modal ──
  const [showAddMeasurePrompt, setShowAddMeasurePrompt] = useState(false);
  const [promptCustomer, setPromptCustomer] = useState<Customer | null>(null);

  // ── Measurement add sub-step (unit → template → fields) ──
  const [measureAddStep, setMeasureAddStep] = useState<"unit" | "template" | "fields">("unit");


  // ─── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, genderFilter]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams({ deviceId: getDeviceId(), search: searchQuery });
      if (genderFilter !== "all") params.set("gender", genderFilter);
      const res = await fetch(`/api/tailoring/customers?${params}`);
      if (res.ok) setCustomers(await res.json());
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  const fetchMeasurements = async (customerId: number) => {
    try {
      const res = await fetch(`/api/tailoring/measurements/${customerId}`);
      if (res.ok) setMeasurements(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCustomerNotes = async (customerId: number) => {
    try {
      const res = await fetch(`/api/notes?deviceId=${getDeviceId()}&customerId=${customerId}&archived=false`);
      if (res.ok) setCustomerNotes(await res.json());
    } catch { /* silent */ }
  };

  const saveCustomerNote = async () => {
    if (!selectedCustomer || !noteForm.title.trim() || !noteForm.content.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          title: noteForm.title.trim(),
          content: noteForm.content.trim(),
          tags: noteForm.tags.trim() || undefined,
          customerId: selectedCustomer.id,
        }),
      });
      if (res.ok) {
        setNoteForm({ show: false, title: "", content: "", tags: "" });
        await fetchCustomerNotes(selectedCustomer.id);
        toast({ title: "Note saved" });
      }
    } catch { /* silent */ }
    finally { setNoteSaving(false); }
  };

  const deleteCustomerNote = async (noteId: number) => {
    if (!confirm("Delete this note?")) return;
    try {
      await fetch(`/api/notes/${noteId}?deviceId=${getDeviceId()}`, { method: "DELETE" });
      setCustomerNotes(prev => prev.filter(n => n.id !== noteId));
      toast({ title: "Note deleted" });
    } catch { /* silent */ }
  };

  const toggleNotePin = async (note: { id: number; isPinned: boolean }) => {
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId(), isPinned: !note.isPinned }),
      });
      if (selectedCustomer) await fetchCustomerNotes(selectedCustomer.id);
    } catch { /* silent */ }
  };

  // Fetch notes when customer detail opens
  useEffect(() => {
    if (view === "client_detail" && selectedCustomer) {
      fetchCustomerNotes(selectedCustomer.id);
    }
  }, [view, selectedCustomer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── URL param deep-link (from Home "Add Measurement" shortcut) ────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const cIdParam = params.get("customerId");

    if (action === "new_client") {
      setView("add_client");
      return;
    }

    if (action === "new_measurement" && cIdParam) {
      const cId = parseInt(cIdParam);
      fetch(`/api/tailoring/customers?deviceId=${getDeviceId()}`)
        .then(r => r.json())
        .then((all: Customer[]) => {
          setCustomers(all);
          const c = all.find(x => x.id === cId);
          if (c) {
            setSelectedCustomer(c);
            fetch(`/api/tailoring/measurements/${cId}`)
              .then(r => r.json())
              .then(setMeasurements)
              .catch(console.error);
            setMeasurementForm({ id: undefined, label: "Initial Measurement", category: "", unit: "Inches", values: {}, customFields: [] });
            setView("add_measurement");
          }
        })
        .catch(console.error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getTemplateFields = useCallback((category: string): string[] => {
    if (SYSTEM_TEMPLATES_META[category]) return SYSTEM_TEMPLATES_META[category].fields;
    const custom = customTemplates.find(t => t.name === category);
    if (custom) return custom.fields;
    return Object.keys(measurementForm.values);
  }, [customTemplates, measurementForm.values]);

  const filteredCategories = useMemo(() => {
    const gender = selectedCustomer?.gender || customerForm.gender;
    const systemCats = Object.entries(SYSTEM_TEMPLATES_META)
      .filter(([, meta]) => {
        if (gender === "others") return true;
        return meta.gender === "both" || meta.gender === gender;
      })
      .map(([name]) => name);
    const customCats = customTemplates
      .filter(t => {
        if (gender === "others") return true;
        return t.gender === "both" || t.gender === gender;
      })
      .map(t => t.name);
    return [...systemCats, ...customCats];
  }, [customerForm.gender, selectedCustomer?.gender, customTemplates]);

  const uniqueCategories = useMemo(() =>
    [...new Set(measurements.map(m => m.category))].sort(),
    [measurements]
  );

  const displayedMeasurements = useMemo(() =>
    categoryFilter === "all" ? measurements : measurements.filter(m => m.category === categoryFilter),
    [measurements, categoryFilter]
  );

  const parseMeasurements = (valStr: string) => {
    try {
      let parsed = JSON.parse(valStr);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      return parsed || {};
    } catch { return {}; }
  };

  const inp = "w-full text-sm rounded-xl px-4 py-3 bg-card border border-border focus:border-primary/50 outline-none transition-all";

  // ─── Handlers — Customer ────────────────────────────────────────────────────

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm("Delete this customer and all their measurements?")) return;
    try {
      const res = await fetch(`/api/tailoring/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Customer and measurements removed." });
        await fetchCustomers();
        setView("clients");
      }
    } catch { toast({ title: "Error", description: "Failed to delete customer." }); }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone) {
      toast({ title: "Required Fields", description: "Name and Phone are required.", variant: "destructive" });
      return;
    }
    const nameVal = validateName(customerForm.name);
    if (!nameVal.valid) {
      toast({ title: "Invalid Name", description: nameVal.message, variant: "destructive" });
      return;
    }
    const phoneVal = validatePhone(customerForm.phone);
    if (!phoneVal.valid) {
      toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" });
      return;
    }
    if (!selectedCustomer && !isPremium && customers.length >= measurementLimit) {
      toast({ title: "Limit Reached", description: `Unlock Premium to add more than ${measurementLimit} customers.`, variant: "destructive" });
      setLocation("/pre-unlock");
      return;
    }
    setLoading(true);
    try {
      const isNew = !selectedCustomer;
      const res = await fetch("/api/tailoring/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...customerForm, deviceId: getDeviceId(), id: selectedCustomer?.id })
      });
      if (res.ok) {
        const saved: Customer = await res.json();
        toast({ title: "Saved", description: "Customer profile saved." });
        await fetchCustomers();
        if (isNew) {
          // For new customers: show "add measurement?" prompt instead of going to list
          resetForms();
          setPromptCustomer(saved);
          setShowAddMeasurePrompt(true);
        } else {
          // For edits: go back to client detail
          setSelectedCustomer(saved);
          fetchMeasurements(saved.id);
          setView("client_detail");
          resetForms();
        }
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Connection error.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  // ─── Handlers — Measurement ─────────────────────────────────────────────────

  const handleDeleteMeasurement = async (id: number) => {
    if (!confirm("Delete this measurement record?")) return;
    try {
      const res = await fetch(`/api/tailoring/measurements/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Measurement record removed." });
        if (selectedCustomer) fetchMeasurements(selectedCustomer.id);
      }
    } catch { toast({ title: "Error", description: "Failed to delete." }); }
  };

  const validateMeasurementValue = (val: string) => !val || /^\d*\.?\d*$/.test(val);

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !measurementForm.category) return;
    for (const [key, val] of Object.entries(measurementForm.values)) {
      if (!validateMeasurementValue(val)) {
        toast({ title: "Invalid", description: `Enter only numbers for ${key}.`, variant: "destructive" });
        return;
      }
    }
    for (const cf of measurementForm.customFields) {
      if (cf.value && !validateMeasurementValue(cf.value)) {
        toast({ title: "Invalid", description: `Enter only numbers for ${cf.name}.`, variant: "destructive" });
        return;
      }
    }
    const finalValues = { ...measurementForm.values };
    measurementForm.customFields.forEach(cf => {
      if (cf.name.trim()) {
        finalValues[cf.name.trim()] = cf.value;
        addCustomMeasurementField(cf.name.trim());
      }
    });
    setLoading(true);
    try {
      const res = await fetch("/api/tailoring/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: measurementForm.id,
          customerId: selectedCustomer.id,
          label: measurementForm.label,
          category: measurementForm.category,
          unit: measurementForm.unit,
          values: finalValues
        })
      });
      if (res.ok) {
        toast({ title: "Saved", description: measurementForm.id ? "Record updated." : "Record saved." });
        fetchMeasurements(selectedCustomer.id);
        setView("client_detail");
      }
    } catch { toast({ title: "Error", description: "Failed to save.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleRepeatMeasurement = (m: Measurement) => {
    setMeasurementForm({
      id: undefined,
      label: `${m.label} (New)`,
      category: m.category,
      unit: (m as any).unit || "Inches",
      values: {},
      customFields: []
    });
    setMeasureAddStep("fields");
    setView("add_measurement");
  };

  // ─── Misc helpers ────────────────────────────────────────────────────────────

  const resetForms = () => {
    setCustomerForm({ name: "", phone: "", gender: "male", email: "", address: "", notes: "" });
    setMeasurementForm({ id: undefined, label: "Initial Measurement", category: "", unit: "Inches", values: {}, customFields: [] });
    setSelectedCustomer(null);
    setShowOptional(false);
  };

  const handleViewDetail = (c: Customer) => {
    setSelectedCustomer(c);
    fetchMeasurements(c.id);
    setCategoryFilter("all");
    setView("client_detail");
  };

  const onBack = () => {
    if (view === "client_detail") {
      setSelectedCustomer(null);
      setView("clients");
    } else if (view === "add_measurement" || view === "edit_measurement") {
      setView("client_detail");
    } else if (view === "add_client" || view === "edit_client") {
      setView(selectedCustomer ? "client_detail" : "clients");
    } else if (view === "measurement_cards") {
      setView("client_detail");
    } else {
      setLocation("/all-tools?cat=clients");
    }
  };

  const pageTitle = {
    clients: "Clients",
    client_detail: selectedCustomer?.name || "Client",
    add_client: "Add Client",
    edit_client: "Edit Client",
    add_measurement: "Add Measurement",
    edit_measurement: "Edit Measurement",
    measurement_cards: "Measurement Cards",
  }[view] ?? "Clients";

  // ─── Gender badge ─────────────────────────────────────────────────────────

  const genderColor = (g: Gender) =>
    g === "female" ? "bg-pink-500/10 text-pink-500"
    : g === "male"   ? "bg-blue-500/10 text-blue-500"
    :                  "bg-purple-500/10 text-purple-500";

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto pb-24 relative min-h-screen">

      {/* ── Post-save "Add Measurement?" prompt ──────────────────────────── */}
      {showAddMeasurePrompt && promptCustomer && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} className="text-primary" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-black">Customer Added!</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{promptCustomer.name}</span> has been saved.
                </p>
                <p className="text-xs text-muted-foreground pt-1">Would you like to add a measurement record now?</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddMeasurePrompt(false);
                    setPromptCustomer(null);
                    setView("clients");
                  }}
                  className="py-3 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const c = promptCustomer;
                    setShowAddMeasurePrompt(false);
                    setPromptCustomer(null);
                    setSelectedCustomer(c);
                    fetchMeasurements(c.id);
                    setMeasurementForm({ id: undefined, label: "Initial Measurement", category: "", unit: "Inches", values: {}, customFields: [] });
                    setMeasureAddStep("unit");
                    setView("add_measurement");
                  }}
                  className="py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  Add Measurement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title={pageTitle}
        subtitle={view === "clients" ? "Manage your client records" : ""}
        onBack={onBack}
      />

      <div className="px-4 py-4 space-y-6">

        {/* ── 1. CLIENTS LIST ─────────────────────────────────────────────── */}
        {view === "clients" && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inp} pl-11`}
              />
            </div>

            {/* Gender filter */}
            <div className="flex gap-2">
              {(["all", "male", "female", "others"] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGenderFilter(g)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all capitalize ${genderFilter === g ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Client list */}
            <div className="space-y-3">
              {customers.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                  <Contact size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground text-sm">No customers found</p>
                </div>
              ) : (
                customers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleViewDetail(c)}
                    className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${genderColor(c.gender)}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{c.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                ))
              )}
            </div>

            {/* FABs */}
            <div className="fixed bottom-24 right-6 flex flex-col gap-3 items-end">
              <button
                onClick={() => { resetForms(); setView("add_client"); }}
                className="flex items-center gap-3 bg-primary text-primary-foreground pl-4 pr-4 py-3.5 rounded-2xl shadow-2xl active:scale-95 transition-all"
              >
                <span className="text-xs font-black uppercase tracking-widest">Add Client</span>
                <UserPlus size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ── 2. ADD / EDIT CLIENT ─────────────────────────────────────────── */}
        {(view === "add_client" || view === "edit_client") && (
          <form onSubmit={handleSaveCustomer} className="bg-card border border-border rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Full Name *</label>
                <input
                  placeholder="e.g. John Doe"
                  value={customerForm.name}
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className={inp}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={customerForm.phone}
                  onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, "") })}
                  className={inp}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "others"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setCustomerForm({ ...customerForm, gender: g })}
                      className={`py-3 rounded-xl text-xs font-bold border transition-all capitalize ${customerForm.gender === g ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="flex items-center gap-2 text-xs font-bold text-primary/80 hover:text-primary transition-colors ml-1"
                >
                  {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showOptional ? "Hide Additional Info" : "Add Email, Address & Notes"}
                </button>
                {showOptional && (
                  <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Email Address</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                        <input
                          type="email"
                          placeholder="client@example.com"
                          value={customerForm.email}
                          onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                          className={`${inp} pl-11`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Delivery Address</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-4 top-3 text-muted-foreground/50" />
                        <textarea
                          placeholder="Delivery address..."
                          value={customerForm.address}
                          onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                          className={`${inp} pl-11 min-h-[80px] py-3`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Internal Notes</label>
                      <textarea
                        placeholder="Any special requests or details..."
                        value={customerForm.notes}
                        onChange={e => setCustomerForm({ ...customerForm, notes: e.target.value })}
                        className={`${inp} min-h-[80px]`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Saving..." : (view === "edit_client" ? "Update Customer" : "Create Customer")}
              {!loading && <CheckCircle2 size={18} />}
            </button>
          </form>
        )}

        {/* ── 3. CLIENT DETAIL ─────────────────────────────────────────────── */}
        {view === "client_detail" && selectedCustomer && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Profile card */}
            <div className="p-6 bg-card border border-border rounded-3xl text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20" />
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto shadow-inner ${genderColor(selectedCustomer.gender)}`}>
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{selectedCustomer.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Phone size={12} className="text-muted-foreground" />
                  <p className="text-sm font-bold text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Mail size={12} className="text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                  </div>
                )}
                {selectedCustomer.notes && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-xl text-[10px] text-muted-foreground italic leading-relaxed">
                    "{selectedCustomer.notes}"
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button
                  onClick={() => {
                    setCustomerForm({
                      name: selectedCustomer.name,
                      phone: selectedCustomer.phone,
                      gender: selectedCustomer.gender,
                      email: selectedCustomer.email || "",
                      address: selectedCustomer.address || "",
                      notes: selectedCustomer.notes || ""
                    });
                    setShowOptional(true);
                    setView("edit_client");
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/50 hover:bg-muted text-foreground transition-all"
                >
                  <Edit2 size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
                </button>
                <button
                  onClick={() => {
                    setMeasurementForm({ id: undefined, label: "Initial Measurement", category: "", unit: "Inches", values: {}, customFields: [] });
                    setMeasureAddStep("unit");
                    setView("add_measurement");
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                >
                  <Plus size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Measure</span>
                </button>
                <button
                  onClick={() => setLocation(`/measurement-card?customerId=${selectedCustomer.id}`)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  <LayoutGrid size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Card</span>
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/${selectedCustomer.phone.replace(/\D/g, "")}`, "_blank")}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-all"
                >
                  <MessageCircle size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Detail tab strip */}
            <div className="flex bg-muted/50 rounded-2xl p-1 gap-1">
              <button
                onClick={() => setDetailTab("measurements")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${detailTab === "measurements" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Ruler size={13} /> Measurements
              </button>
              <button
                onClick={() => setDetailTab("notes")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${detailTab === "notes" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <NotebookPen size={13} /> Notes {customerNotes.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black">{customerNotes.length}</span>}
              </button>
            </div>

            {/* ── NOTES TAB ────────────────────────────────────────────────── */}
            {detailTab === "notes" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Add note form */}
                {noteForm.show ? (
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <NotebookPen size={14} className="text-teal-500" />
                      <span className="text-sm font-black">New Note for {selectedCustomer.name}</span>
                    </div>
                    <input
                      placeholder="Title..."
                      value={noteForm.title}
                      onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full text-sm rounded-xl px-4 py-3 bg-muted/50 border border-border outline-none focus:border-primary/50 transition-all"
                      autoFocus
                    />
                    <textarea
                      placeholder="Note content..."
                      value={noteForm.content}
                      onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
                      rows={4}
                      className="w-full text-sm rounded-xl px-4 py-3 bg-muted/50 border border-border outline-none focus:border-primary/50 transition-all resize-none"
                    />
                    <input
                      placeholder="Tags (comma-separated, optional)..."
                      value={noteForm.tags}
                      onChange={e => setNoteForm(f => ({ ...f, tags: e.target.value }))}
                      className="w-full text-sm rounded-xl px-4 py-2.5 bg-muted/50 border border-border outline-none focus:border-primary/50 transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNoteForm({ show: false, title: "", content: "", tags: "" })}
                        className="py-3 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveCustomerNote}
                        disabled={noteSaving || !noteForm.title.trim() || !noteForm.content.trim()}
                        className="py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
                      >
                        {noteSaving ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNoteForm(f => ({ ...f, show: true }))}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-teal-500/30 hover:border-teal-500/60 text-teal-600 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={15} /> Add Note
                  </button>
                )}

                {/* Notes list */}
                {customerNotes.length === 0 && !noteForm.show ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <NotebookPen size={28} className="mx-auto opacity-20 mb-3" />
                    <p className="text-xs">No notes for this customer yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...customerNotes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)).map(note => (
                      <div key={note.id} className={`bg-card border rounded-2xl p-3.5 group ${note.isPinned ? "border-primary/25" : "border-border"}`}>
                        {note.isPinned && <div className="h-0.5 w-full bg-gradient-to-r from-primary/50 to-transparent rounded mb-2.5 -mt-3.5 -mx-3.5" style={{ width: "calc(100% + 1.75rem)" }} />}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {note.isPinned && <Pin size={10} className="text-primary shrink-0" />}
                              <p className="text-sm font-bold truncate">{note.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{note.content}</p>
                            {note.tags && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {note.tags.split(",").filter(Boolean).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-muted rounded-full text-[9px] font-bold text-muted-foreground">{t.trim()}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleNotePin(note)} className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} title={note.isPinned ? "Unpin" : "Pin"}>
                              <Pin size={11} />
                            </button>
                            <button onClick={() => deleteCustomerNote(note.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors" title="Delete">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground/40 mt-2">
                          {(() => { const d = (Date.now() - new Date(note.updatedAt).getTime()) / 1000; if (d < 60) return "just now"; if (d < 3600) return `${Math.floor(d / 60)}m ago`; if (d < 86400) return `${Math.floor(d / 3600)}h ago`; return new Date(note.updatedAt).toLocaleDateString(); })()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MEASUREMENTS TAB ─────────────────────────────────────────── */}
            {detailTab === "measurements" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                  <Ruler size={14} /> Measurement Records
                </h3>
                <span className="text-[10px] text-muted-foreground">{measurements.length} record{measurements.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Category filter chips */}
              {uniqueCategories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${categoryFilter === "all" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                  >
                    All ({measurements.length})
                  </button>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${categoryFilter === cat ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                    >
                      {cat} ({measurements.filter(m => m.category === cat).length})
                    </button>
                  ))}
                </div>
              )}

              {displayedMeasurements.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl">
                  <Ruler size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground">
                    {categoryFilter === "all" ? "No measurements recorded yet" : `No "${categoryFilter}" records`}
                  </p>
                  {categoryFilter === "all" ? (
                    <button onClick={() => setView("add_measurement")} className="mt-4 text-xs font-black text-primary uppercase tracking-widest">
                      Create First Record
                    </button>
                  ) : (
                    <button onClick={() => setCategoryFilter("all")} className="mt-3 text-xs font-bold text-muted-foreground">
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                displayedMeasurements.map(m => (
                  <div key={m.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/20 transition-all">
                    <div className="p-4 bg-muted/10 flex justify-between items-center border-b border-border">
                      <div>
                        <p className="text-xs font-black">{m.label}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{m.category}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setLocation(`/measurement-card?customerId=${selectedCustomer.id}&recordId=${m.id}`)}
                          className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Generate Card"
                        >
                          <LayoutGrid size={12} />
                        </button>
                        <button
                          onClick={() => handleRepeatMeasurement(m)}
                          className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                          title="Repeat (new record with same template)"
                        >
                          <RefreshCw size={12} />
                        </button>
                        <button
                          onClick={() => {
                            const vals = parseMeasurements(m.values);
                            setMeasurementForm({
                              id: m.id,
                              label: m.label,
                              category: m.category,
                              unit: (m as any).unit || "Inches",
                              values: vals,
                              customFields: []
                            });
                            setView("edit_measurement");
                          }}
                          className="p-1.5 rounded-md hover:bg-muted text-foreground"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteMeasurement(m.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries(parseMeasurements(m.values)).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-border/30 pb-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{k}</span>
                          <span className="text-[10px] font-bold">{v as string}{(m as any).unit === "CM" ? "cm" : '"'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            )} {/* end detailTab === "measurements" */}

            <button
              onClick={() => handleDeleteCustomer(selectedCustomer.id)}
              className="w-full py-4 text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors"
            >
              Delete Client Profile
            </button>
          </div>
        )}

        {/* ── 4. ADD MEASUREMENT (stepped: unit → template → fields) ─────────── */}
        {view === "add_measurement" && selectedCustomer && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* Step breadcrumb */}
            <div className="flex gap-1.5 px-1">
              {(["unit", "template", "fields"] as const).map((s, i) => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  measureAddStep === s ? "bg-primary" :
                  ["unit","template","fields"].indexOf(measureAddStep) > i ? "bg-primary/40" : "bg-muted"
                }`} />
              ))}
            </div>

            {/* ── Sub-step 1: Unit ─────────────────────────────────────────── */}
            {measureAddStep === "unit" && (
              <div className="bg-card border border-border rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Record Name</label>
                  <input
                    placeholder="e.g. Wedding Suit, School Uniform..."
                    value={measurementForm.label}
                    onChange={e => setMeasurementForm({ ...measurementForm, label: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-3 block">
                    Choose Measurement Unit
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {(["Inches", "CM"] as const).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setMeasurementForm({ ...measurementForm, unit: u });
                          setTimeout(() => setMeasureAddStep("template"), 200);
                        }}
                        className={`py-8 rounded-2xl border-2 text-base font-black transition-all active:scale-95 ${
                          measurementForm.unit === u
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                            : "bg-card border-border text-foreground hover:border-primary/40"
                        }`}
                      >
                        {u}
                        <span className="block text-[10px] mt-1 font-normal opacity-70">{u === "Inches" ? "12\" = 1 ft" : "30cm = 1 ft"}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">Tap a unit to continue →</p>
                </div>
              </div>
            )}

            {/* ── Sub-step 2: Template ─────────────────────────────────────── */}
            {measureAddStep === "template" && (
              <div className="bg-card border border-border rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full border border-primary/20 uppercase tracking-widest">
                    {measurementForm.unit}
                  </span>
                  <div className="flex items-center justify-between flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Choose Template</label>
                    <button
                      type="button"
                      onClick={() => setLocation("/measurement-templates")}
                      className="text-[10px] font-bold text-primary flex items-center gap-1"
                    >
                      <SlidersHorizontal size={11} /> Manage
                    </button>
                  </div>
                </div>

                {/* System templates */}
                {Object.entries(SYSTEM_TEMPLATES_META).filter(([, m]) => {
                  const g = selectedCustomer.gender;
                  return g === "others" || m.gender === "both" || m.gender === g;
                }).length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">System Templates</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(SYSTEM_TEMPLATES_META)
                        .filter(([, m]) => {
                          const g = selectedCustomer.gender;
                          return g === "others" || m.gender === "both" || m.gender === g;
                        })
                        .map(([cat, m]) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setMeasurementForm({ ...measurementForm, category: cat, values: {} });
                              setTimeout(() => setMeasureAddStep("fields"), 200);
                            }}
                            className="p-3 text-left rounded-xl border text-xs font-bold transition-all active:scale-95 bg-muted/20 border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                          >
                            <span className="block">{cat}</span>
                            <span className="text-[9px] font-normal opacity-50">{m.fields.length} fields</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Custom templates */}
                {filteredCategories.filter(c => !SYSTEM_TEMPLATES_META[c]).length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">My Templates</p>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredCategories.filter(c => !SYSTEM_TEMPLATES_META[c]).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setMeasurementForm({ ...measurementForm, category: cat, values: {} });
                            setTimeout(() => setMeasureAddStep("fields"), 200);
                          }}
                          className="p-3 text-left rounded-xl border text-xs font-bold transition-all active:scale-95 bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMeasureAddStep("unit")}
                  className="w-full py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Change Unit
                </button>
              </div>
            )}

            {/* ── Sub-step 3: Fields ───────────────────────────────────────── */}
            {measureAddStep === "fields" && measurementForm.category && (
              <form onSubmit={handleSaveMeasurement} className="bg-card border border-border rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Summary chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full border border-primary/20 uppercase tracking-widest">{measurementForm.unit}</span>
                  <span className="px-2.5 py-1 bg-muted text-foreground text-[10px] font-bold rounded-full border border-border">{measurementForm.category}</span>
                  <button type="button" onClick={() => setMeasureAddStep("template")} className="text-[10px] text-primary font-bold ml-auto">Change</button>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Record Name</label>
                  <input
                    placeholder="e.g. Wedding Suit"
                    value={measurementForm.label}
                    onChange={e => setMeasurementForm({ ...measurementForm, label: e.target.value })}
                    className={inp}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-3">Measurements ({measurementForm.unit})</p>
                  <div className="grid grid-cols-2 gap-4">
                    {getTemplateFields(measurementForm.category).map(field => (
                      <div key={field}>
                        <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">{field}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.0"
                          value={measurementForm.values[field] || ""}
                          onChange={e => setMeasurementForm({ ...measurementForm, values: { ...measurementForm.values, [field]: e.target.value } })}
                          className={`${inp} py-2.5`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extra fields */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Extra Fields</p>
                    <button
                      type="button"
                      onClick={() => setMeasurementForm({ ...measurementForm, customFields: [...measurementForm.customFields, { name: "", value: "" }] })}
                      className="text-[10px] font-bold text-primary flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {customMeasurementFields.filter(f => !getTemplateFields(measurementForm.category).includes(f)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {customMeasurementFields.filter(f => !getTemplateFields(measurementForm.category).includes(f)).map(f => (
                        <button key={f} type="button"
                          onClick={() => { if (!measurementForm.customFields.some(cf => cf.name === f)) setMeasurementForm({ ...measurementForm, customFields: [...measurementForm.customFields, { name: f, value: "" }] }); }}
                          className="px-2 py-1 rounded-lg bg-muted/40 text-[10px] text-muted-foreground hover:bg-muted border border-border transition-all">
                          + {f}
                        </button>
                      ))}
                    </div>
                  )}
                  {measurementForm.customFields.map((cf, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input placeholder="Field Name" value={cf.name}
                          onChange={e => { const nf = [...measurementForm.customFields]; nf[idx].name = e.target.value; setMeasurementForm({ ...measurementForm, customFields: nf }); }}
                          className={`${inp} py-2 text-xs`} />
                      </div>
                      <div className="flex-1">
                        <input placeholder="Value" value={cf.value}
                          onChange={e => { const nf = [...measurementForm.customFields]; nf[idx].value = e.target.value; setMeasurementForm({ ...measurementForm, customFields: nf }); }}
                          className={`${inp} py-2 text-xs`} />
                      </div>
                      <button type="button" onClick={() => setMeasurementForm({ ...measurementForm, customFields: measurementForm.customFields.filter((_, i) => i !== idx) })} className="p-2.5 text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Record"}
                  {!loading && <CheckCircle2 size={18} />}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── 4b. EDIT MEASUREMENT (all-at-once) ──────────────────────────────── */}
        {view === "edit_measurement" && selectedCustomer && (
          <form onSubmit={handleSaveMeasurement} className="bg-card border border-border rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Record Name *</label>
                <input placeholder="e.g. Wedding Suit" value={measurementForm.label} onChange={e => setMeasurementForm({ ...measurementForm, label: e.target.value })} className={inp} required />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Unit</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Inches", "CM"] as const).map(u => (
                    <button key={u} type="button" onClick={() => setMeasurementForm({ ...measurementForm, unit: u })}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${measurementForm.unit === u ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              {measurementForm.category && (
                <div className="space-y-6 pt-4 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Template: <span className="text-primary">{measurementForm.category}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {getTemplateFields(measurementForm.category).map(field => (
                      <div key={field}>
                        <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">{field}</label>
                        <input type="text" inputMode="decimal" placeholder="0.0" value={measurementForm.values[field] || ""}
                          onChange={e => setMeasurementForm({ ...measurementForm, values: { ...measurementForm.values, [field]: e.target.value } })}
                          className={`${inp} py-2.5`} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Extra Fields</p>
                      <button type="button" onClick={() => setMeasurementForm({ ...measurementForm, customFields: [...measurementForm.customFields, { name: "", value: "" }] })} className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <Plus size={12} /> Add Field
                      </button>
                    </div>
                    {measurementForm.customFields.map((cf, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input placeholder="Field Name" value={cf.name}
                            onChange={e => { const nf = [...measurementForm.customFields]; nf[idx].name = e.target.value; setMeasurementForm({ ...measurementForm, customFields: nf }); }}
                            className={`${inp} py-2 text-xs`} />
                        </div>
                        <div className="flex-1">
                          <input placeholder="Value" value={cf.value}
                            onChange={e => { const nf = [...measurementForm.customFields]; nf[idx].value = e.target.value; setMeasurementForm({ ...measurementForm, customFields: nf }); }}
                            className={`${inp} py-2 text-xs`} />
                        </div>
                        <button type="button" onClick={() => setMeasurementForm({ ...measurementForm, customFields: measurementForm.customFields.filter((_, i) => i !== idx) })} className="p-2.5 text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading || !measurementForm.category}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? "Saving..." : "Update Record"}
              {!loading && <CheckCircle2 size={18} />}
            </button>
          </form>
        )}

        {/* ── 5. PREMIUM TEASER ────────────────────────────────────────────── */}
        {(view === "clients" || view === "client_detail") && (
          isPremium ? (
            <div className="mt-12 p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 text-primary">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Crown size={20} /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">Unlock OneTailor Pro</h3>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed opacity-80">{proUpgradeMessage}</p>
              <a
                href={proUpgradeLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
              >
                <ExternalLink size={14} />
                {proUpgradeButtonText}
              </a>
            </div>
          ) : (
            <div className="mt-12 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><ShieldCheck size={20} /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">Unlock Premium</h3>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed opacity-80">
                Unlock professional features: unlimited client records, full measurement history, custom templates, and advanced tailoring tools.
              </p>
              <button
                onClick={() => setLocation("/pre-unlock")}
                className="flex items-center justify-center gap-2 w-full py-4 bg-amber-500 text-amber-950 rounded-2xl font-bold text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-95 transition-all"
              >
                <Crown size={14} /> Unlock Premium Now
              </button>
            </div>
          )
        )}

      </div>
    </div>
  );
}
