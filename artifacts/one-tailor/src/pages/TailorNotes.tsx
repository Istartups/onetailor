import { useState, useEffect, useMemo } from "react";
import {
  NotebookPen, Plus, Search, Pin, Archive, Trash2, Edit2,
  X, Check, RotateCcw, Users, Tag, ChevronLeft, FileText,
  User, Filter
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

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map(t => t.trim()).filter(Boolean);
}

// ─── Note Form ────────────────────────────────────────────────────────────────

interface NoteFormProps {
  initialNote?: Note | null;
  customers: Customer[];
  onSave: (data: { title: string; content: string; customerId?: number | null; tags?: string; isPinned?: boolean }) => Promise<void>;
  onCancel: () => void;
}

function NoteForm({ initialNote, customers, onSave, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initialNote?.title || "");
  const [content, setContent] = useState(initialNote?.content || "");
  const [customerId, setCustomerId] = useState<number | null>(initialNote?.customerId ?? null);
  const [tags, setTags] = useState(initialNote?.tags || "");
  const [isPinned, setIsPinned] = useState(initialNote?.isPinned ?? false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), content: content.trim(), customerId: customerId || null, tags: tags.trim(), isPinned });
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
          rows={6}
          className={inp}
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

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all group ${note.isPinned ? "border-primary/30 shadow-sm shadow-primary/10" : "border-border"}`}>
      {note.isPinned && (
        <div className="h-0.5 bg-gradient-to-r from-primary/60 to-primary/20" />
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

        <p className="text-[9px] text-muted-foreground/50 pt-1">{timeAgo(note.updatedAt)}</p>
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

  // ── Fetch ─────────────────────────────────────────────────────────────────

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
      if (res.ok) setNotes(await res.json());
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
  }, [filter, search]);

  // ── Filtered notes client-side (search already server-side but also local) ──

  const pinnedNotes = useMemo(() => notes.filter(n => n.isPinned), [notes]);
  const regularNotes = useMemo(() => notes.filter(n => !n.isPinned), [notes]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async (data: { title: string; content: string; customerId?: number | null; tags?: string; isPinned?: boolean }) => {
    try {
      if (editingNote) {
        const res = await fetch(`/api/notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, ...data }),
        });
        if (res.ok) { toast({ title: "Updated", description: "Note saved." }); setView("list"); setEditingNote(null); await fetchNotes(); }
        else { toast({ title: "Error", description: "Failed to update note.", variant: "destructive" }); }
      } else {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, ...data }),
        });
        if (res.ok) { toast({ title: "Saved", description: "Note created." }); setView("list"); await fetchNotes(); }
        else { toast({ title: "Error", description: "Failed to create note.", variant: "destructive" }); }
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

  // ── Filter tabs ───────────────────────────────────────────────────────────

  const FILTERS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all",     label: "All",     icon: <FileText size={11} /> },
    { key: "general", label: "General", icon: <NotebookPen size={11} /> },
    { key: "client",  label: "Client",  icon: <Users size={11} /> },
    { key: "pinned",  label: "Pinned",  icon: <Pin size={11} /> },
    { key: "archived",label: "Archive", icon: <Archive size={11} /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Tailor Notes"
        subtitle={notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : "Quick notes for your work"}
        icon={<NotebookPen size={22} className="text-teal-500" />}
      />

      <div className="px-4 pb-24 space-y-4">

        {/* Form view */}
        {(view === "form" || view === "edit") && (
          <NoteForm
            initialNote={view === "edit" ? editingNote : null}
            customers={customers}
            onSave={handleSave}
            onCancel={() => { setView("list"); setEditingNote(null); }}
          />
        )}

        {/* List view */}
        {view === "list" && (
          <>
            {/* Search */}
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

            {/* Filter chips */}
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

            {/* Add button */}
            <button
              onClick={() => { setEditingNote(null); setView("form"); }}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 text-primary font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> New Note
            </button>

            {/* Notes list */}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(173,80%,40%)", borderTopColor: "transparent" }} />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                <NotebookPen size={36} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-sm font-bold text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {filter === "archived" ? "No archived notes." : "Tap \"New Note\" to capture your first note."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pinned section */}
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

                {/* Regular notes */}
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

      {/* FAB */}
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
