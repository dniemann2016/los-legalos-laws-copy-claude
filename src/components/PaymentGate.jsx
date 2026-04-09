import { useState } from "react";
import { Lock, Zap, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { stripeCheckout } from "@/functions/stripeCheckout";
import { useUserProfile } from "../hooks/useUserProfile";

const LABELS = {
  DE: {
    title: "Premium-Modul",
    sub: "Dieser Bereich erfordert ein aktives Abonnement.",
    price: "29 $/Monat",
    btn: "Jetzt freischalten",
    loading: "Weiterleitung zu Stripe…",
    back: "Zurück zur Übersicht",
    note: "Sicherer Checkout via Stripe. Kündigung jederzeit möglich.",
    iframeWarn: "Der Checkout ist nur in der veröffentlichten App verfügbar.",
  },
  EN: {
    title: "Premium Module",
    sub: "This section requires an active subscription.",
    price: "$29/month",
    btn: "Unlock now",
    loading: "Redirecting to Stripe…",
    back: "Back to overview",
    note: "Secure checkout via Stripe. Cancel anytime.",
    iframeWarn: "Checkout is only available in the published app.",
  },
  FR: {
    title: "Module Premium",
    sub: "Cette section nécessite un abonnement actif.",
    price: "29 $/mois",
    btn: "Débloquer maintenant",
    loading: "Redirection vers Stripe…",
    back: "Retour à l'aperçu",
    note: "Paiement sécurisé via Stripe. Résiliation possible à tout moment.",
    iframeWarn: "Le paiement n'est disponible que dans l'application publiée.",
  },
};

export default function PaymentGate({ children, hasAccess }) {
  const [loading, setLoading] = useState(false);
  const { language } = useUserProfile();
  const t = LABELS[language] || LABELS.DE;

  if (hasAccess) return children;

  const handleCheckout = async () => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert(t.iframeWarn);
      return;
    }
    setLoading(true);
    const res = await stripeCheckout({ type: "module" });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-[#1a3560]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-[#1a3560]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">{t.title}</h2>
        <p className="text-sm text-slate-500 mb-6">{t.sub}</p>
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-2xl font-bold text-slate-900">{t.price}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t.note}</p>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-[#1a3560] text-white font-semibold py-3 rounded-xl hover:bg-[#142a4d] transition-colors disabled:opacity-60 mb-3">
          {loading ? t.loading : t.btn}
        </button>
        <Link to="/modules" className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
        </Link>
      </div>
    </div>
  );
}