import { useState } from "react";
import { Brain, Zap } from "lucide-react";
import { stripeCheckout } from "@/functions/stripeCheckout";
import { useUserProfile } from "../hooks/useUserProfile";

const LABELS = {
  DE: {
    title: "KI-Funktion",
    sub: "Diese KI-Analyse kostet 1 Credit pro Nutzung.",
    price: "1,99 $ / Nutzung",
    btn: "Credit kaufen & ausführen",
    loading: "Weiterleitung zu Stripe…",
    credits: (n) => `Du hast ${n} Credit${n !== 1 ? "s" : ""}`,
    use: "Credit verwenden",
    iframeWarn: "Der Checkout ist nur in der veröffentlichten App verfügbar.",
  },
  EN: {
    title: "AI Function",
    sub: "This AI analysis costs 1 credit per use.",
    price: "$1.99 / use",
    btn: "Buy credit & run",
    loading: "Redirecting to Stripe…",
    credits: (n) => `You have ${n} credit${n !== 1 ? "s" : ""}`,
    use: "Use credit",
    iframeWarn: "Checkout is only available in the published app.",
  },
  FR: {
    title: "Fonction IA",
    sub: "Cette analyse IA coûte 1 crédit par utilisation.",
    price: "1,99 $ / utilisation",
    btn: "Acheter un crédit et lancer",
    loading: "Redirection vers Stripe…",
    credits: (n) => `Vous avez ${n} crédit${n !== 1 ? "s" : ""}`,
    use: "Utiliser un crédit",
    iframeWarn: "Le paiement n'est disponible que dans l'application publiée.",
  },
};

export default function KIPaymentGate({ children, kiCredits, onCreditUsed }) {
  const [loading, setLoading] = useState(false);
  const { language } = useUserProfile();
  const t = LABELS[language] || LABELS.DE;

  const hasCredits = (kiCredits || 0) > 0;

  if (hasCredits) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            {t.credits(kiCredits)}
          </span>
          <button
            onClick={onCreditUsed}
            className="text-xs bg-[#1a3560] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#142a4d] transition-colors">
            {t.use}
          </button>
        </div>
        {children}
      </div>
    );
  }

  const handleBuy = async () => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert(t.iframeWarn);
      return;
    }
    setLoading(true);
    const res = await stripeCheckout({ type: "ki" });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
      <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Brain className="w-5 h-5 text-violet-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">{t.title}</h3>
      <p className="text-xs text-slate-500 mb-4">{t.sub}</p>
      <div className="text-base font-bold text-slate-900 mb-4">{t.price}</div>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full bg-violet-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60">
        {loading ? t.loading : t.btn}
      </button>
    </div>
  );
}