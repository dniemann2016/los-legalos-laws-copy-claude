export default function BeweismatrixChart({ args, evidence }) {
  if (!args.length || !evidence.length) return null;

  const getEvForArg = (arg) => {
    const byId = (arg.evidence_ids || []).map(id => evidence.find(e => e.id === id)).filter(Boolean);
    const byRef = evidence.filter(e => e.argument_id === arg.id && !byId.find(b => b.id === e.id));
    return [...byId, ...byRef];
  };

  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  const maxEv = Math.max(...args.map(a => getEvForArg(a).length), 1);

  const ArgRow = ({ arg }) => {
    const evs = getEvForArg(arg);
    const density = evs.length / maxEv;
    const isEigen = arg.side === "eigen";

    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className="w-36 flex-shrink-0 text-right">
          <span className={`text-[11px] font-medium leading-tight line-clamp-2 ${isEigen ? "text-blue-800" : "text-red-800"}`}>
            {arg.title}
          </span>
        </div>
        <div className="flex-1 flex items-center gap-1.5">
          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isEigen ? "bg-blue-500" : "bg-red-400"}`}
              style={{ width: `${Math.max(density * 100, evs.length > 0 ? 8 : 0)}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold w-5 text-right ${isEigen ? "text-blue-700" : "text-red-600"}`}>
            {evs.length}
          </span>
          <div className="flex gap-0.5 flex-wrap max-w-[120px]">
            {evs.slice(0, 5).map((ev, i) => (
              <div key={i} title={ev.title}
                className={`w-3 h-3 rounded-sm flex-shrink-0 ${isEigen ? "bg-blue-200 border border-blue-400" : "bg-red-100 border border-red-300"}`}
              />
            ))}
            {evs.length > 5 && <span className="text-[9px] text-gray-400 self-center">+{evs.length - 5}</span>}
            {evs.length === 0 && (
              <span className="text-[9px] text-gray-300 italic">kein Beweis</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalEigen = eigenArgs.reduce((s, a) => s + getEvForArg(a).length, 0);
  const totalGegner = gegnerArgs.reduce((s, a) => s + getEvForArg(a).length, 0);
  const unlinked = evidence.filter(e =>
    !e.argument_id && !args.some(a => (a.evidence_ids || []).includes(e.id))
  ).length;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">📊 Beweis-Matrix</h4>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            Eigene: {totalEigen} Beweise
          </span>
          <span className="flex items-center gap-1.5 text-red-600 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            Gegner: {totalGegner} Beweise
          </span>
          {unlinked > 0 && (
            <span className="text-amber-600 font-medium">⚠️ {unlinked} unverknüpft</span>
          )}
        </div>
      </div>

      {eigenArgs.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Eigene Argumente</p>
          {eigenArgs.map(a => <ArgRow key={a.id} arg={a} />)}
        </div>
      )}

      {gegnerArgs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Gegner-Argumente</p>
          {gegnerArgs.map(a => <ArgRow key={a.id} arg={a} />)}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-6 text-[10px] text-gray-400">
        <span>Balkenbreite = relative Beweisdichte</span>
        <span>■ = einzelner Beweis (Hover für Titel)</span>
      </div>
    </div>
  );
}