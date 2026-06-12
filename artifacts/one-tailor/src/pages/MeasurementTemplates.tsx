import { useState, useMemo } from "react";
import { Layers, Plus, Trash2, Check, ChevronDown, ArrowRight, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { SYSTEM_TEMPLATES_META, MEASUREMENT_FIELD_LIBRARY } from "@/lib/measurement-data";

const inp = "w-full px-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground/50";

type Gender = "male" | "female" | "both";

const genderStyle: Record<Gender, string> = {
  male:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
  female: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  both:   "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default function MeasurementTemplates() {
  const { toast }               = useToast();
  const [, setLocation]         = useLocation();

  const customTemplates         = useAppStore(s => s.customTemplates);
  const customMeasurementFields = useAppStore(s => s.customMeasurementFields);
  const addCustomTemplate       = useAppStore(s => s.addCustomTemplate);
  const deleteCustomTemplate    = useAppStore(s => s.deleteCustomTemplate);
  const addCustomMeasurementField = useAppStore(s => s.addCustomMeasurementField);

  const [showCreate, setShowCreate]   = useState(false);
  const [showSystem, setShowSystem]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | Gender>("all");
  const [form, setForm] = useState({
    name: "",
    gender: "both" as Gender,
    selectedFields: [] as string[],
    customFieldInput: "",
  });

  const filteredTemplates = useMemo(() => {
    return customTemplates.filter(t => {
      const matchesName = !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === "all" || t.gender === genderFilter;
      return matchesName && matchesGender;
    });
  }, [customTemplates, searchQuery, genderFilter]);

  const toggleField = (field: string) =>
    setForm(f => ({
      ...f,
      selectedFields: f.selectedFields.includes(field)
        ? f.selectedFields.filter(x => x !== field)
        : [...f.selectedFields, field],
    }));

  const handleAddCustomField = () => {
    const name = form.customFieldInput.trim();
    if (!name) return;
    if (form.selectedFields.includes(name)) {
      toast({ description: "Field already added." });
      return;
    }
    addCustomMeasurementField(name);
    setForm(f => ({ ...f, selectedFields: [...f.selectedFields, name], customFieldInput: "" }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (form.selectedFields.length === 0) {
      toast({ title: "Select at least one field", variant: "destructive" });
      return;
    }
    if (SYSTEM_TEMPLATES_META[form.name.trim()]) {
      toast({ title: "Name conflicts with a system template", description: "Choose a different name.", variant: "destructive" });
      return;
    }
    if (customTemplates.some(t => t.name === form.name.trim())) {
      toast({ title: "Template already exists", variant: "destructive" });
      return;
    }
    addCustomTemplate({ name: form.name.trim(), gender: form.gender, fields: form.selectedFields });
    setForm({ name: "", gender: "both", selectedFields: [], customFieldInput: "" });
    setShowCreate(false);
    toast({ title: "Template saved!", description: `"${form.name.trim()}" is now available in measurements.` });
  };

  return (
    <div className="max-w-xl mx-auto pb-24">
      <PageHeader
        title="Measurement Templates"
        subtitle="Save garment presets for one-tap reuse"
        backPath="/all-tools?cat=measurements"
        backLabel="Measurements"
      />

      <div className="px-4 py-5 space-y-6">

        {/* Use-in-measurement hint */}
        <button
          onClick={() => setLocation("/customer-measurement")}
          className="w-full flex items-center justify-between p-4 rounded-2xl border border-dashed transition-all active:scale-[0.98]"
          style={{ borderColor: "rgba(212,160,32,0.3)", background: "rgba(212,160,32,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,160,32,0.12)" }}>
              <Layers size={18} style={{ color: "hsl(43,82%,55%)" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: "hsl(43,25%,90%)" }}>Apply in Client Measurements</p>
              <p className="text-xs text-muted-foreground">Select a template when adding a new measurement</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted-foreground shrink-0" />
        </button>

        {/* My Templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Layers size={13} /> My Templates
              {customTemplates.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/5">{customTemplates.length}</span>
              )}
            </h3>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <Plus size={12} />
              {showCreate ? "Cancel" : "Create"}
            </button>
          </div>

          {/* Search + Gender filter — only shown when there are templates */}
          {customTemplates.length > 0 && (
            <div className="space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search templates…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium bg-muted/30 border border-border outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {(["all", "male", "female", "both"] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all capitalize ${
                      genderFilter === g
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    {g === "all" ? "All" : g === "both" ? "All Genders" : g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {customTemplates.length === 0 && !showCreate && (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-3xl">
              <Layers size={32} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground">No custom templates yet</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-xs font-black text-primary uppercase tracking-widest">
                Create your first template
              </button>
            </div>
          )}

          {filteredTemplates.length === 0 && customTemplates.length > 0 && (
            <div className="text-center py-10 bg-card border border-dashed border-border rounded-3xl">
              <Search size={26} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground">No templates match your filter</p>
              <button
                onClick={() => { setSearchQuery(""); setGenderFilter("all"); }}
                className="mt-3 text-xs font-black text-primary uppercase tracking-widest"
              >
                Clear filters
              </button>
            </div>
          )}

          {filteredTemplates.map(t => (
            <div key={t.id} className="p-4 bg-card border border-border rounded-2xl flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold">{t.name}</p>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${genderStyle[t.gender]}`}>
                    {t.gender}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{t.fields.length} fields</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                  {t.fields.slice(0, 6).join(", ")}{t.fields.length > 6 ? "…" : ""}
                </p>
              </div>
              <button
                onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteCustomTemplate(t.id); }}
                className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-all shrink-0 active:scale-90"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-card border border-primary/20 rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <h4 className="text-sm font-black uppercase tracking-widest text-primary">New Template</h4>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Template Name *</label>
              <input
                placeholder="e.g. Agbada Suit, Ladies Gown..."
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={inp}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Fits For</label>
              <div className="grid grid-cols-3 gap-2">
                {(["male", "female", "both"] as Gender[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all capitalize ${form.gender === g ? "bg-primary/10 border-primary text-primary" : "bg-muted/20 border-border text-muted-foreground"}`}
                  >
                    {g === "both" ? "All" : g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 block">
                Select Measurement Fields
                {form.selectedFields.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px]">
                    {form.selectedFields.length} selected
                  </span>
                )}
              </label>

              {Object.entries(MEASUREMENT_FIELD_LIBRARY).map(([group, fields]) => (
                <div key={group}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">{group}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {fields.map(field => {
                      const selected = form.selectedFields.includes(field);
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => toggleField(field)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${selected ? "bg-primary/10 border-primary text-primary" : "bg-muted/20 border-border text-muted-foreground"}`}
                        >
                          <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${selected ? "bg-primary border-primary" : "border-border"}`}>
                            {selected && <Check size={10} className="text-primary-foreground" />}
                          </div>
                          <span className="truncate">{field}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {customMeasurementFields.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Your Saved Fields</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {customMeasurementFields.map(field => {
                      const selected = form.selectedFields.includes(field);
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => toggleField(field)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${selected ? "bg-primary/10 border-primary text-primary" : "bg-amber-500/10 border-amber-500/20 text-amber-600"}`}
                        >
                          <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${selected ? "bg-primary border-primary" : "border-amber-500/30"}`}>
                            {selected && <Check size={10} className="text-primary-foreground" />}
                          </div>
                          <span className="truncate">{field}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Add Custom Field</p>
                <div className="flex gap-2">
                  <input
                    placeholder="e.g. Collar Depth"
                    value={form.customFieldInput}
                    onChange={e => setForm({ ...form, customFieldInput: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomField(); } }}
                    className={`${inp} flex-1 py-2.5 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Save Template <Check size={18} />
            </button>
          </div>
        )}

        {/* System templates reference */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <button
            onClick={() => setShowSystem(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <p className="text-sm font-bold">System Templates</p>
              <p className="text-xs text-muted-foreground">{Object.keys(SYSTEM_TEMPLATES_META).length} built-in garment types</p>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showSystem ? "rotate-180" : ""}`} />
          </button>
          {showSystem && (
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              {Object.entries(SYSTEM_TEMPLATES_META).map(([name, meta]) => (
                <div key={name} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                  <div>
                    <p className="text-xs font-bold">{name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{meta.fields.length} fields</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${genderStyle[meta.gender]}`}>
                    {meta.gender}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
