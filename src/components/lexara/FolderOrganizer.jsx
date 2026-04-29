import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FolderOpen, Folder, Plus, X, Pencil, User, Building2, Check, ChevronRight } from "lucide-react";

const FOLDER_COLORS = [
  "#0A84FF", "#1DB954", "#FF9500", "#FF3B30",
  "#5856D6", "#FF2D55", "#AF52DE", "#636366",
];

const SF = { fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif" };
const C = {
  separator: "rgba(0,0,0,0.08)",
  label: "#1C1C1E",
  label2: "#636366",
  label3: "#AEAEB2",
  card: "#FFFFFF",
  shadowSm: "0 1px 4px rgba(0,0,0,0.07)",
};

function FolderModal({ folder, onSave, onClose }) {
  const [form, setForm] = useState({
    name: folder?.name || "",
    color: folder?.color || "#0A84FF",
    mandant_name: folder?.mandant_name || "",
    mandant_email: folder?.mandant_email || "",
    mandant_typ: folder?.mandant_typ || "Privatperson",
    description: folder?.description || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (folder?.id) {
      await base44.entities.CaseFolder.update(folder.id, form);
    } else {
      await base44.entities.CaseFolder.create(form);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.40)", backdropFilter: "blur(10px)",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="animate-modal" style={{
        background: "rgba(250,250,250,0.98)",
        border: `1px solid ${C.separator}`,
        borderRadius: 22, padding: 28, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 60px rgba(0,0,0,0.22)", ...SF,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.label, letterSpacing: "-0.02em" }}>
              {folder ? "Ordner bearbeiten" : "Neuen Ordner erstellen"}
            </h2>
            <p style={{ fontSize: 11, color: C.label3, marginTop: 3 }}>Mandant & Ordner-Einstellungen</p>
          </div>
          <button onClick={onClose} style={{ color: C.label3, padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Farbauswahl */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.label2, marginBottom: 7 }}>Ordnerfarbe</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FOLDER_COLORS.map(col => (
                <button key={col} onClick={() => setForm(f => ({ ...f, color: col }))} style={{
                  width: 28, height: 28, borderRadius: 8, background: col, border: "none", cursor: "pointer",
                  boxShadow: form.color === col ? `0 0 0 3px ${col}50, 0 0 0 5px #fff, 0 0 0 6px ${col}80` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "box-shadow 0.15s",
                }}>
                  {form.color === col && <Check style={{ width: 13, height: 13, color: "#fff" }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Ordnername */}
          <input
            placeholder="Ordnername *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              background: "rgba(0,0,0,0.04)", border: `1px solid ${C.separator}`,
              borderRadius: 10, outline: "none", color: C.label, boxSizing: "border-box",
            }}
          />

          {/* Mandant */}
          <div style={{ borderTop: `1px solid ${C.separator}`, paddingTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.label2, marginBottom: 7 }}>Mandant-Zuordnung</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["Privatperson", "Unternehmen", "Behörde", "Sonstiges"].map(t => {
                const active = form.mandant_typ === t;
                const Icon = t === "Unternehmen" || t === "Behörde" ? Building2 : User;
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, mandant_typ: t }))} style={{
                    padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                    border: active ? `2px solid ${form.color}` : `1px solid ${C.separator}`,
                    background: active ? `${form.color}12` : "rgba(255,255,255,0.6)",
                    display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <Icon style={{ width: 13, height: 13, color: active ? form.color : C.label3 }} />
                    <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? form.color : C.label2 }}>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input
            placeholder="Name des Mandanten"
            value={form.mandant_name}
            onChange={e => setForm(f => ({ ...f, mandant_name: e.target.value }))}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              background: "rgba(0,0,0,0.04)", border: `1px solid ${C.separator}`,
              borderRadius: 10, outline: "none", color: C.label, boxSizing: "border-box",
            }}
          />
          <input
            placeholder="E-Mail des Mandanten (optional)"
            value={form.mandant_email}
            onChange={e => setForm(f => ({ ...f, mandant_email: e.target.value }))}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              background: "rgba(0,0,0,0.04)", border: `1px solid ${C.separator}`,
              borderRadius: 10, outline: "none", color: C.label, boxSizing: "border-box",
            }}
          />
          <textarea
            placeholder="Notizen zum Mandanten / Ordner (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13, resize: "none",
              background: "rgba(0,0,0,0.04)", border: `1px solid ${C.separator}`,
              borderRadius: 10, outline: "none", color: C.label, boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={!form.name.trim() || saving} style={{
            flex: 1, background: form.color, color: "#fff", fontSize: 13, fontWeight: 600,
            padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
            opacity: (!form.name.trim() || saving) ? 0.45 : 1,
            boxShadow: `0 3px 12px ${form.color}50`,
            transition: "opacity 0.12s",
          }}>
            {saving ? "Speichere…" : folder ? "Speichern" : "Ordner erstellen"}
          </button>
          <button onClick={onClose} style={{
            padding: "11px 18px", fontSize: 13, background: "transparent",
            border: `1px solid ${C.separator}`, borderRadius: 12, color: C.label2, cursor: "pointer",
          }}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// Assign-Fall-to-Folder Dropdown
export function AssignFolderDropdown({ caseId, currentFolderId, folders, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const assign = async (folderId) => {
    setSaving(true);
    await base44.entities.Case.update(caseId, { folder_id: folderId || null });
    setSaving(false);
    setOpen(false);
    onAssigned();
  };

  const current = folders.find(f => f.id === currentFolderId);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        disabled={saving}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          border: current ? `1px solid ${current.color}40` : `1px solid ${C.separator}`,
          background: current ? `${current.color}10` : "rgba(0,0,0,0.04)",
          color: current ? current.color : C.label3,
          cursor: "pointer",
        }}
      >
        {current
          ? <><Folder style={{ width: 11, height: 11 }} /> {current.name}</>
          : <><FolderOpen style={{ width: 11, height: 11 }} /> Kein Ordner</>
        }
        <ChevronRight style={{ width: 9, height: 9, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 99,
          background: "#fff", border: `1px solid ${C.separator}`,
          borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
          minWidth: 200, overflow: "hidden",
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "6px 4px" }}>
            <button onClick={() => assign(null)} style={{
              width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12,
              background: !currentFolderId ? "rgba(0,0,0,0.05)" : "transparent",
              border: "none", cursor: "pointer", borderRadius: 8, color: C.label2,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <FolderOpen style={{ width: 13, height: 13, color: C.label3 }} />
              Ohne Ordner
            </button>
            {folders.map(f => (
              <button key={f.id} onClick={() => assign(f.id)} style={{
                width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12,
                background: currentFolderId === f.id ? `${f.color}10` : "transparent",
                border: "none", cursor: "pointer", borderRadius: 8,
                color: currentFolderId === f.id ? f.color : C.label,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Folder style={{ width: 13, height: 13, color: f.color }} />
                <span style={{ flex: 1 }}>{f.name}</span>
                {f.mandant_name && <span style={{ fontSize: 10, color: C.label3 }}>{f.mandant_name}</span>}
                {currentFolderId === f.id && <Check style={{ width: 11, height: 11, color: f.color }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Folder Sidebar / Panel
export default function FolderOrganizer({ folders, selectedFolderId, onSelectFolder, onFoldersChanged, caseCounts }) {
  const [showModal, setShowModal] = useState(false);
  const [editFolder, setEditFolder] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (folder, e) => {
    e.stopPropagation();
    if (!confirm(`Ordner "${folder.name}" löschen? Die enthaltenen Fälle werden nicht gelöscht.`)) return;
    setDeleting(folder.id);
    // Remove folder_id from all cases in this folder
    const cases = await base44.entities.Case.filter({ folder_id: folder.id });
    for (const c of cases) {
      await base44.entities.Case.update(c.id, { folder_id: null });
    }
    await base44.entities.CaseFolder.delete(folder.id);
    setDeleting(null);
    onFoldersChanged();
  };

  const handleEdit = (folder, e) => {
    e.stopPropagation();
    setEditFolder(folder);
    setShowModal(true);
  };

  return (
    <>
      <div style={{ ...SF, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* "Alle Fälle" */}
        <button
          onClick={() => onSelectFolder(null)}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 11, background: !selectedFolderId ? "rgba(0,0,0,0.07)" : "transparent",
            border: "none", cursor: "pointer", textAlign: "left", width: "100%",
            transition: "background 0.14s",
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: "rgba(0,0,0,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <FolderOpen style={{ width: 15, height: 15, color: C.label2 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: !selectedFolderId ? 700 : 500, color: C.label, lineHeight: 1.2 }}>Alle Fälle</p>
            <p style={{ fontSize: 10, color: C.label3 }}>{caseCounts?.total || 0} Fälle</p>
          </div>
        </button>

        {/* Ordner */}
        {folders.map(folder => {
          const active = selectedFolderId === folder.id;
          const count = caseCounts?.[folder.id] || 0;
          return (
            <div key={folder.id} style={{ position: "relative" }}
              onMouseEnter={e => e.currentTarget.querySelector(".folder-actions").style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.querySelector(".folder-actions").style.opacity = "0"}
            >
              <button
                onClick={() => onSelectFolder(folder.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  borderRadius: 11,
                  background: active ? `${folder.color}12` : "transparent",
                  border: active ? `1px solid ${folder.color}30` : "1px solid transparent",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "all 0.14s",
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: active ? folder.color : `${folder.color}20`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "background 0.14s",
                }}>
                  <Folder style={{ width: 15, height: 15, color: active ? "#fff" : folder.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 40 }}>
                  <p style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? folder.color : C.label, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {folder.name}
                  </p>
                  <p style={{ fontSize: 10, color: C.label3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {folder.mandant_name || "Kein Mandant"} · {count} Fall{count !== 1 ? "…" : ""}
                  </p>
                </div>
              </button>

              {/* Hover actions */}
              <div className="folder-actions" style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                display: "flex", gap: 4, opacity: 0, transition: "opacity 0.15s",
              }}>
                <button onClick={e => handleEdit(folder, e)} style={{
                  width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer",
                  background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Pencil style={{ width: 10, height: 10, color: C.label2 }} />
                </button>
                <button onClick={e => handleDelete(folder, e)} disabled={deleting === folder.id} style={{
                  width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer",
                  background: "rgba(255,59,48,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <X style={{ width: 10, height: 10, color: "#FF3B30" }} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Neuer Ordner Button */}
        <button onClick={() => { setEditFolder(null); setShowModal(true); }} style={{
          display: "flex", alignItems: "center", gap: 9, padding: "8px 12px",
          borderRadius: 10, border: `1px dashed ${C.separator}`,
          background: "transparent", cursor: "pointer", marginTop: 4,
          width: "100%", transition: "background 0.14s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Plus style={{ width: 13, height: 13, color: C.label3 }} />
          <span style={{ fontSize: 12, color: C.label3, fontWeight: 500 }}>Neuer Ordner</span>
        </button>
      </div>

      {showModal && (
        <FolderModal
          folder={editFolder}
          onSave={() => { setShowModal(false); setEditFolder(null); onFoldersChanged(); }}
          onClose={() => { setShowModal(false); setEditFolder(null); }}
        />
      )}
    </>
  );
}