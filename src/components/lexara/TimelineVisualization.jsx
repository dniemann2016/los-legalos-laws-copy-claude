import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link2, X, ChevronDown, ChevronUp, Calendar, Clock, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  offen: { label: "Offen", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  erledigt: { label: "Erledigt", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  versaeumt: { label: "Versäumt", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  in_bearbeitung: { label: "In Bearb.", color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
};

const STATUS_COLS = ["offen", "in_bearbeitung", "erledigt", "versaeumt"];

function ArgLinkModal({ deadline, args, onClose, onSave }) {
  const [selected, setSelected] = useState(deadline.linked_arg_ids || []);
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-800">🔗 Argumente verknüpfen</h4>
            <p className="text-xs text-gray-500 mt-0.5">{deadline.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
          {args.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Keine Argumente vorhanden</p>}
          {args.map(arg => (
            <label key={arg.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selected.includes(arg.id) ? "bg-blue-50 border-blue-200" : "border-gray-100 hover:bg-gray-50"}`}>
              <input type="checkbox" checked={selected.includes(arg.id)} onChange={() => toggle(arg.id)} className="rounded" />
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${arg.side === "eigen" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {arg.side === "eigen" ? "Eigen" : "Gegner"}
              </span>
              <span className="text-xs text-gray-700 flex-1">{arg.title}</span>
              <span className="text-[10px] text-gray-400">{arg.strength || 5}/10</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button size="sm" className="flex-1 bg-gray-900 text-white" onClick={() => onSave(selected)}>Speichern</Button>
        </div>
      </div>
    </div>
  );
}

function TimelineCard({ item, args, provided, isDragging, onStatusChange, onLinkArgs }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.offen;
  const linkedArgs = args.filter(a => (item.linked_arg_ids || []).includes(a.id));
  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== "erledigt";

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`bg-white rounded-xl border ${isOverdue ? "border-red-300" : "border-gray-200"} p-3 shadow-sm transition-shadow ${isDragging ? "shadow-lg ring-2 ring-blue-300" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{item.title}</p>
            <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {item.due_date && (
              <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(item.due_date).toLocaleDateString("de-DE")}
              </span>
            )}
            {item.frist_type && <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{item.frist_type}</span>}
            {item.side && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.side === "Gegner" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>{item.side}</span>}
          </div>
          {linkedArgs.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {linkedArgs.map(a => (
                <span key={a.id} className="text-[9px] bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                  <Link2 className="w-2 h-2" />{a.title.slice(0, 18)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
          {item.paragraph && <p className="text-[10px] text-gray-500">§ {item.paragraph}</p>}
          {item.responsible && <p className="text-[10px] text-gray-500">👤 {item.responsible}</p>}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 mb-1">Status ändern:</p>
            <div className="flex gap-1 flex-wrap">
              {STATUS_COLS.map(s => (
                <button key={s} onClick={() => onStatusChange(item.id, s)}
                  className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-all ${item.status === s ? STATUS_CONFIG[s].color : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => onLinkArgs(item)}
            className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 transition-colors">
            <Link2 className="w-3 h-3" /> Argumente verknüpfen ({linkedArgs.length})
          </button>
        </div>
      )}
    </div>
  );
}

export default function TimelineVisualization({ caseId, args = [] }) {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkModal, setLinkModal] = useState(null); // deadline being linked
  const [view, setView] = useState("kanban"); // kanban | timeline

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Deadline.filter({ case_id: caseId });
    setDeadlines(data.sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0)));
    setLoading(false);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const id = result.draggableId;
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    await base44.entities.Deadline.update(id, { status: newStatus });
  };

  const handleStatusChange = async (id, newStatus) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    await base44.entities.Deadline.update(id, { status: newStatus });
  };

  const handleLinkArgs = (deadline) => setLinkModal(deadline);

  const handleSaveLinks = async (selectedArgIds) => {
    const id = linkModal.id;
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, linked_arg_ids: selectedArgIds } : d));
    await base44.entities.Deadline.update(id, { linked_arg_ids: selectedArgIds });
    setLinkModal(null);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" /></div>;

  // Timeline view: chronological
  const sortedDeadlines = [...deadlines].sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[["kanban", "📋 Kanban"], ["timeline", "⏳ Zeitstrahl"]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${view === v ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">{deadlines.length} Fristen/Ereignisse · Drag & Drop zum Statuswechsel</p>
      </div>

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATUS_COLS.map(status => {
              const items = deadlines.filter(d => (d.status || "offen") === status);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className="flex flex-col gap-2">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold ${cfg.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                    <span className="ml-auto font-normal opacity-70">{items.length}</span>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`min-h-20 rounded-xl p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-100"}`}>
                        {items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(prov, snap) => (
                              <TimelineCard
                                item={item} args={args}
                                provided={prov} isDragging={snap.isDragging}
                                onStatusChange={handleStatusChange}
                                onLinkArgs={handleLinkArgs}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[10px] text-gray-400 text-center py-3">Hierher ziehen</p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* TIMELINE VIEW */}
      {view === "timeline" && (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-3 pl-10">
            {sortedDeadlines.length === 0 && <p className="text-xs text-gray-400">Keine Fristen erfasst</p>}
            {sortedDeadlines.map((item, i) => {
              const cfg = STATUS_CONFIG[item.status || "offen"];
              const isOverdue = item.due_date && new Date(item.due_date) < now && item.status !== "erledigt";
              const isPast = item.due_date && new Date(item.due_date) < now;
              const linkedArgs = args.filter(a => (item.linked_arg_ids || []).includes(a.id));
              return (
                <div key={item.id} className="relative">
                  <div className={`absolute -left-7 top-3 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${cfg.dot}`}>
                    {item.status === "erledigt" && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    {item.status === "versaeumt" && <AlertTriangle className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className={`bg-white border rounded-xl p-3 ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.due_date && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-red-600 font-semibold" : isPast ? "text-gray-400" : "text-blue-600"}`}>
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(item.due_date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                              {isOverdue && " ⚠️ ÜBERFÄLLIG"}
                            </span>
                          )}
                          {item.side && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.side === "Gegner" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>{item.side}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        {linkedArgs.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {linkedArgs.map(a => (
                              <span key={a.id} className="text-[9px] bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                                <Link2 className="w-2 h-2" />{a.title.slice(0, 20)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex gap-1 flex-wrap justify-end">
                          {STATUS_COLS.map(s => (
                            <button key={s} onClick={() => handleStatusChange(item.id, s)}
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-medium transition-all ${item.status === s ? STATUS_CONFIG[s].color : "border-gray-200 text-gray-300 hover:text-gray-500 hover:border-gray-300"}`}>
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => handleLinkArgs(item)}
                          className="flex items-center gap-0.5 text-[9px] text-blue-500 hover:text-blue-700 transition-colors">
                          <Link2 className="w-2.5 h-2.5" /> Argumente ({linkedArgs.length})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {linkModal && (
        <ArgLinkModal
          deadline={linkModal}
          args={args}
          onClose={() => setLinkModal(null)}
          onSave={handleSaveLinks}
        />
      )}
    </div>
  );
}