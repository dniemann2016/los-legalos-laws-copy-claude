import { useState } from "react";
import { Info, ChevronDown, ChevronRight } from "lucide-react";

export default function AIExplanation({ title, explanation, formula, children, inline = false }) {
  const [open, setOpen] = useState(false);

  if (inline) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex-1">{children}</div>
        <button
          onClick={() => setOpen(!open)}
          className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors mt-0.5"
          title={title}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        {open && (
          <div className="absolute mt-8 bg-white border border-blue-200 rounded-lg p-3 text-xs text-blue-900 max-w-xs shadow-lg z-10">
            <p className="font-semibold mb-1">{title}</p>
            <p className="text-blue-800 mb-2">{explanation}</p>
            {formula && (
              <div className="bg-blue-50 rounded p-2 font-mono text-[9px] text-blue-700 break-words">
                {formula}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-900">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="w-3 h-3 text-blue-600" />
        ) : (
          <ChevronRight className="w-3 h-3 text-blue-600" />
        )}
      </button>
      {open && (
        <div className="mt-2 text-xs text-blue-800 space-y-2">
          <p>{explanation}</p>
          {formula && (
            <div className="bg-white rounded p-2 font-mono text-[9px] border border-blue-200 text-blue-700 break-words">
              {formula}
            </div>
          )}
        </div>
      )}
    </div>
  );
}