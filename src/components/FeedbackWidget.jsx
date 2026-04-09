import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const LABELS = {
  DE: { title: "War diese Analyse hilfreich?", placeholder: "Optionaler Kommentar (max. 300 Zeichen)…", send: "Senden", thanks: "Danke für Ihr Feedback!" },
  EN: { title: "Was this analysis helpful?", placeholder: "Optional comment (max. 300 chars)…", send: "Submit", thanks: "Thank you for your feedback!" },
  FR: { title: "Cette analyse était-elle utile?", placeholder: "Commentaire optionnel (max. 300 caractères)…", send: "Envoyer", thanks: "Merci pour votre retour!" },
};

export default function FeedbackWidget({ jurisdiction, topic, context, language = "DE" }) {
  const [vote, setVote] = useState(null); // "up" | "down"
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const l = LABELS[language] || LABELS.DE;

  const submit = async () => {
    if (!vote) return;
    setSubmitting(true);
    const insightText = [
      `Vote: ${vote === "up" ? "positive" : "negative"}`,
      comment.trim() ? `Comment: ${comment.trim().slice(0, 300)}` : null,
      context ? `Context: ${context.slice(0, 500)}` : null,
    ].filter(Boolean).join(" | ");

    await base44.entities.JurisdictionInsight.create({
      jurisdiction,
      topic: topic || "ai_analysis_feedback",
      source_type: "argumentation_pattern",
      insight_text: insightText,
      usage_count: 1,
      effectiveness_score: vote === "up" ? 8 : 3,
      tags: ["feedback", vote === "up" ? "positive" : "negative", jurisdiction],
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-xs font-medium py-2">
        <CheckCircle2 className="w-4 h-4" />
        {l.thanks}
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
      <p className="text-xs font-semibold text-gray-500">{l.title}</p>
      <div className="flex gap-2">
        <button onClick={() => setVote("up")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            vote === "up" ? "bg-green-50 border-green-400 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600"
          }`}>
          <ThumbsUp className="w-3.5 h-3.5" /> Ja
        </button>
        <button onClick={() => setVote("down")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            vote === "down" ? "bg-red-50 border-red-400 text-red-700" : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600"
          }`}>
          <ThumbsDown className="w-3.5 h-3.5" /> Nein
        </button>
      </div>

      {vote && (
        <div className="flex gap-2">
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={300}
            placeholder={l.placeholder}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400 bg-gray-50"
          />
          <button onClick={submit} disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
            <Send className="w-3 h-3" /> {l.send}
          </button>
        </div>
      )}
    </div>
  );
}