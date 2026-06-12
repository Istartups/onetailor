import { useState, useEffect, useMemo, useRef } from "react";
import {
  NotebookPen, Plus, Search, Pin, Archive, Trash2, Edit2,
  X, Check, RotateCcw, Users, Tag, ChevronLeft, FileText,
  User, ImageIcon, Camera
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { getDeviceId } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: number;
  deviceId: string;
  title: string;
  content: string;
  customerId: number | null;
  customerName?: string | null;
  tags: string | null;
  isPinned: boolean;
  isArchived: boolean;
  imageData?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

type FilterType = "all" | "general" | "client" | "pinned" | "archived";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapNote(row: any): Note {
  return {
    id: row.id,
    deviceId: row.device_id ?? row.deviceId ?? "",
    title: row.title ?? "",
    content: row.content ?? "",
    customerId: row.customer_id ?? row.customerId ?? null,
    customerName: row.customer_name ?? row.customerName ?? null,
    tags: row.tags ?? null,
    isPinned: row.is_pinned ?? row.isPinned ?? false,
    isArchived: row.is_archived ?? row.isArchived ?? false,
    imageData: row.image_data ?? row.imageData ?? null,
    createdAt: row.created_at ?? row.createdAt ?? "",
    updatedAt: row.updated_at ?? row.updatedAt ?? "",
  };
}

function safeTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "No date";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map(t => t.trim()).filter(Boolean);
}

async function compressImage(file: File, maxPx = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Note Form ────────────────────────────────────────────────────────────────

interface NoteFormProps {
  initialNote?: Note | null;
  customers: Customer[];
  onSave: (data: {
    title: string; content: string; customerId?: number | null;
    tags?: string; isPinned?: boolean; imageData?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

function NoteForm({ initialNote, customers, onSave, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title || "");
  const [content, setContent] = useState(initialNote?.content || "");
  const [customerId, setCustomerId] = useState<number | null>(initialNote?.customerId ?? null);
  const [tags, setTags] = useState(initialNote?.tags || "");
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned ?? false);
  const [imageData, setImageData] = useState<string | null>(initialNote?.imageData ?? null);
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Only JPG, PNG, WEBP images are supported.");
      return;
    }
    setImageLoading(true);
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
    } catch {
      alert("Failed to process image.");
    } finally {
      setImageLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(), content: content.trim(),
        customerId: customerId || null, tags: tags.trim(),
        isPinned, imageData,
      });
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full text-sm rounded-xl px-4 py-3 bg-card border border-border focus:border-primary/50 outline-none transition-all resize-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={onCancel} className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-black">{initialNote ? "Edit Note" : "New Note"}</h2>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Title *</label>
        <input
          placeholder="Note title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className={inp}
          autoFocus
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Content *</label>
        <textarea
          placeholder="Write your note here..."
          value={content}
          onChange={e => setContent(e.target.value)}
          required
          rows={5}
          className={inp}
        />
      </div>

      {/* Image attachment */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">
          Attach Image (optional)
        </label>
        {imageData ? (
          <div className="relative rounded-2xl overflow-hidden border border-border group">
            <img src={imageData} alt="Note attachment" className="w-full max-h-52 object-cover" />
            <button
              type="button"
              onClick={() => setImageData(null)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 rounded-xl text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imageLoading}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {imageLoading ? (
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-primary" />
            ) : (
              <>
                <Camera size={22} className="opacity-40" />
                <span className="text-xs font-bold">Tap to attach image</span>
                <span className="text-[10px] opacity-50">JPG · PNG · WEBP</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImage}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Attach to Customer (optional)</label>
        <select
          value={customerId ?? ""}
          onChange={e => setCustomerId(e.target.value ? parseInt(e.target.value) : null)}
          className={inp}
        >
          <option value="">— General note (no customer) —</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Tags (comma-separated)</label>
        <input
          placeholder="e.g. fabric, zipper, measurement..."
          value={tags}
          onChange={e => setTags(e.target.value)}
          className={inp}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
        <div>
          <p className="text-sm font-bold">Pin this note</p>
          <p className="text-[10px] text-muted-foreground">Pinned notes appear at the top</p>
        </div>
        <button
          type="button"
          onClick={() => setIsPinned(!isPinned)}
          className={`w-11 h-6 rounded-full transition-all duration-200 ${isPinned ? "bg-primary" : "bg-muted"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 mx-0.5 ${isPinned ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="py-3.5 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : <><Check size={16} /> Save Note</>}
        </button>
      </div>
    </form>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
}

function NoteCard({ note, onEdit, onDelete, onTogglePin, onToggleArchive }: NoteCardProps) {
  const tags = parseTags(note.tags);
  const [imgExpanded, setImgExpanded] = useState(false);

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all group ${note.isPinned ? "border-primary/30 shadow-sm shadow-primary/10" : "border-border"}`}>
      {note.isPinned && (
        <div className="h-0.5 bg-gradient-to-r from-primary/60 to-primary/20" />
      )}

      {/* Image preview */}
      {note.imageData && (
        <div
          className={`overflow-hidden cursor-pointer transition-all ${imgExpanded ? "max-h-96" : "max-h-32"}`}
          onClick={() => setImgExpanded(!imgExpanded)}
        >
          <img
            src={note.imageData}
            alt="Note attachment"
            className="w-full object-cover"
          />
          <div className="flex items-center gap-1 px-3 py-1.5 bg-black/10 dark:bg-white/5">
            <ImageIcon size={9} className="text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground font-bold">{imgExpanded ? "Tap to collapse" : "Tap to expand"}</span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {note.isPinned && <Pin size={11} className="text-primary shrink-0" />}
              <h3 className="text-sm font-black leading-tight truncate">{note.title}</h3>
            </div>
            {note.customerName && (
              <div className="flex items-center gap-1 mt-0.5">
                <User size={9} className="text-muted-foreground" />
                <span className="text-[10px] text-primary/70 font-semibold">{note.customerName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Edit">
              <Edit2 size={12} />
            </button>
            <button onClick={onTogglePin} className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`} title={note.isPinned ? "Unpin" : "Pin"}>
              <Pin size={12} />
            </button>
            <button onClick={onToggleArchive} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title={note.isArchived ? "Unarchive" : "Archive"}>
              {note.isArchived ? <RotateCcw size={12} /> : <Archive size={12} />}
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors" title="Delete">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{note.content}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border">{t}</span>
            ))}
          </div>
        )}

        <p className="text-[9px] text-muted-foreground/50 pt-1">{safeTimeAgo(note.updatedAt)}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TailorNotes() {
  const { toast } = useToast();
  const deviceId = getDeviceId();

  const [notes, setNotes] = useState<Note[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form" | "edit">("list");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ deviceId });
      if (filter === "archived") params.set("archived", "true");
      else params.set("archived", "false");
      if (filter === "general") params.set("type", "general");
      if (filter === "client") params.set("type", "client");
      if (filter === "pinned") params.set("pinned", "true");
      if (search) params.set("search", search);
      const res = await fetch(`/api/notes?${params}`);
      if (res.ok) setNotes((await res.json()).map(mapNote));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/tailoring/customers?deviceId=${deviceId}`);
      if (res.ok) setCustomers(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotes();
    fetchCustomers();
  }, [filter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinnedNotes = useMemo(() => notes.filter(n => n.isPinned), [notes]);
  const regularNotes = useMemo(() => notes.filter(n => !n.isPinned), [notes]);

  const handleSave = async (data: {
    title: string; content: string; customerId?: number | null;
    tags?: string; isPinned?: boolean; imageData?: string | null;
  }) => {
    try {
      if (editingNote) {
        const res = await fetch(`/api/notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, ...data }),
        });
        if (res.ok) {
          toast({ title: "Updated", description: "Note saved." });
          setView("list"); setEditingNote(null); await fetchNotes();
        } else {
          toast({ title: "Error", description: "Failed to update note.", variant: "destructive" });
        }
      } else {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, ...data }),
        });
        if (res.ok) {
          const raw = await res.json();
          const saved = mapNote(raw);
          setNotes(prev => [saved, ...prev]);
          toast({ title: "Saved", description: "Note created." });
          setView("list"); await fetchNotes();
        } else {
          toast({ title: "Error", description: "Failed to create note.", variant: "destructive" });
        }
      }
    } catch { toast({ title: "Error", description: "Connection error.", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    try {
      await fetch(`/api/notes/${id}?deviceId=${deviceId}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Note removed." });
      await fetchNotes();
    } catch { toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }); }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, isPinned: !note.isPinned }),
      });
      await fetchNotes();
    } catch { /* silent */ }
  };

  const handleToggleArchive = async (note: Note) => {
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, isArchived: !note.isArchived }),
      });
      toast({ title: note.isArchived ? "Restored" : "Archived", description: note.isArchived ? "Note restored." : "Note archived." });
      await fetchNotes();
    } catch { /* silent */ }
  };

  const FILTERS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all",     label: "All",     icon: <FileText size={11} /> },
    { key: "general", label: "General", icon: <NotebookPen size={11} /> },
    { key: "client",  label: "Client",  icon: <Users size={11} /> },
    { key: "pinned",  label: "Pinned",  icon: <Pin size={11} /> },
    { key: "archived",label: "Archive", icon: <Archive size={11} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Tailor Notes"
        subtitle={notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : "Quick notes for your work"}
      />

      <div className="px-4 pb-24 space-y-4">

        {(view === "form" || view === "edit") && (
          <NoteForm
            initialNote={view === "edit" ? editingNote : null}
            customers={customers}
            onSave={handleSave}
            onCancel={() => { setView("list"); setEditingNote(null); }}
          />
        )}

        {view === "list" && (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
                  <X size={13} className="text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                    filter === f.key ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {f.icon}{f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setEditingNote(null); setView("form"); }}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 text-primary font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> New Note
            </button>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(173,80%,40%)", borderTopColor: "transparent" }} />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl space-y-3">
                <NotebookPen size={44} className="mx-auto text-muted-foreground/15" />
                <p className="text-sm font-bold text-muted-foreground">
                  {filter === "archived" ? "No archived notes." : search ? "No matching notes." : "No notes yet"}
                </p>
                {filter === "all" && !search && (
                  <p className="text-xs text-muted-foreground/60 max-w-[200px] mx-auto leading-relaxed">
                    Capture style sketches, fabric details, measurements, or reference photos.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {pinnedNotes.length > 0 && filter !== "archived" && (
                  <>
                    <div className="flex items-center gap-2 px-1">
                      <Pin size={11} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pinned</span>
                    </div>
                    {pinnedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onEdit={() => { setEditingNote(note); setView("edit"); }}
                        onDelete={() => handleDelete(note.id)}
                        onTogglePin={() => handleTogglePin(note)}
                        onToggleArchive={() => handleToggleArchive(note)}
                      />
                    ))}
                    {regularNotes.length > 0 && (
                      <div className="flex items-center gap-2 px-1 pt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Others</span>
                      </div>
                    )}
                  </>
                )}
                {regularNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => { setEditingNote(note); setView("edit"); }}
                    onDelete={() => handleDelete(note.id)}
                    onTogglePin={() => handleTogglePin(note)}
                    onToggleArchive={() => handleToggleArchive(note)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {view === "list" && (
        <button
          onClick={() => { setEditingNote(null); setView("form"); }}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-all z-30"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
