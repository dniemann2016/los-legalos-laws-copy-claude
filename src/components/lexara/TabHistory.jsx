import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, Search, Filter, Download } from "lucide-react";

const ENTITY_ICONS = {
  Argument: "⚖️",
  Evidence: "📄",
  Deadline: "⏰",
  Person: "👤",
  Document: "📋",
  Case: "📁",
  Risk: "⚠️",
};

const ACTION_COLORS = {
  create: "bg-green-50 text-green-700 border-green-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
};

function TimelineEntry({ entry, expanded, onToggle }) {
  const icon = ENTITY_ICONS[entry.entity_type] || "•";
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("de-DE");

  let oldVal, newVal;
  try {
    oldVal = entry.old_value ? JSON.parse(entry.old_value) : null;
    newVal = entry.new_value ? JSON.parse(entry.new_value) : null;
  } catch {
    oldVal = entry.old_value;
    newVal = entry.new_value;
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
      <button
        onClick={() => onToggle()}
        className="w-full flex items-start gap-4 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0">
          <div className={`w-3 h-3 rounded-full ring-4 ring-white ${
            entry.action === 'create' ? 'bg-green-500' :
            entry.action === 'update' ? 'bg-blue-500' :
            'bg-red-500'
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-base">{icon}</span>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">
              {entry.entity_type}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ACTION_COLORS[entry.action]}`}>
              {entry.action}
            </span>
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{timeStr}</span>
          </div>
          <p className="text-sm text-gray-800 font-medium mb-1">{entry.entity_title || entry.summary}</p>
          <p className="text-xs text-gray-600">{entry.summary}</p>
          {entry.user_email && (
            <p className="text-[10px] text-gray-400 mt-1">von {entry.user_email}</p>
          )}
        </div>

        {/* Expand button */}
        <div className="flex-shrink-0">
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100 space-y-3 pt-3">
          {entry.field_changed && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Feld</p>
              <p className="text-xs text-gray-700 font-mono">{entry.field_changed}</p>
            </div>
          )}

          {entry.old_value && (
            <div>
              <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Alter Wert</p>
              <div className="bg-white rounded-lg p-2 border border-red-100">
                <code className="text-[10px] text-gray-700 break-all">
                  {typeof oldVal === 'object' ? JSON.stringify(oldVal, null, 2) : String(oldVal)}
                </code>
              </div>
            </div>
          )}

          {entry.new_value && (
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Neuer Wert</p>
              <div className="bg-white rounded-lg p-2 border border-green-100">
                <code className="text-[10px] text-gray-700 break-all">
                  {typeof newVal === 'object' ? JSON.stringify(newVal, null, 2) : String(newVal)}
                </code>
              </div>
            </div>
          )}

          {entry.entity_id && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entity ID</p>
              <p className="text-[10px] text-gray-600 font-mono">{entry.entity_id}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Zeitstempel</p>
            <p className="text-[10px] text-gray-600 font-mono">{entry.timestamp}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabHistory({ caseId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    loadHistory();
  }, [caseId]);

  const loadHistory = async () => {
    setLoading(true);
    const entries = await base44.entities.CaseHistory.filter({ case_id: caseId }, "-timestamp", 100);
    setHistory(entries);
    setLoading(false);
  };

  const filtered = history.filter(h => {
    const matchSearch = !searchTerm ||
      h.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.entity_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === "all" || h.entity_type === filterType;
    const matchAction = filterAction === "all" || h.action === filterAction;

    return matchSearch && matchType && matchAction;
  });

  const exportAsCSV = () => {
    const headers = ["Zeitstempel", "Entity-Typ", "Aktion", "Zusammenfassung", "Feld", "Nutzer"];
    const rows = filtered.map(h => [
      new Date(h.timestamp).toLocaleString("de-DE"),
      h.entity_type,
      h.action,
      h.summary,
      h.field_changed || "—",
      h.user_email || "—",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fall-Historie_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">📜 Fallhistorie & Audit-Trail</h3>
            <p className="text-xs text-gray-500 mt-0.5">{filtered.length} Einträge · Alle Änderungen nachvollziehbar</p>
          </div>
          <button
            onClick={exportAsCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen nach Entity-Titel, Feld, Zusammenfassung…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Entity Type Filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300"
            >
              <option value="all">Alle Entity-Typen</option>
              {Object.keys(ENTITY_ICONS).map(type => (
                <option key={type} value={type}>{ENTITY_ICONS[type]} {type}</option>
              ))}
            </select>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300"
            >
              <option value="all">Alle Aktionen</option>
              <option value="create">✨ Erstellt</option>
              <option value="update">📝 Geändert</option>
              <option value="delete">🗑️ Gelöscht</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <TimelineEntry
              key={entry.id || i}
              entry={entry}
              expanded={expandedId === (entry.id || i)}
              onToggle={() => setExpandedId(expandedId === (entry.id || i) ? null : (entry.id || i))}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500">Noch keine Einträge</p>
          <p className="text-xs text-gray-400 mt-1">
            {searchTerm || filterType !== "all" || filterAction !== "all"
              ? "Versuche andere Filter"
              : "Änderungen werden hier protokolliert"}
          </p>
        </div>
      )}
    </div>
  );
}