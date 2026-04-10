import { useState } from "react";
import { Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../hooks/useUserProfile";
import DisclaimerStep from "../components/onboarding/DisclaimerStep";
import LanguageStep from "../components/onboarding/LanguageStep";
import JurisdictionStep from "../components/onboarding/JurisdictionStep";

const STEP_LABELS = {
  DE: ["Sprache", "Nutzungsbedingungen", "Rechtsordnung"],
  EN: ["Language", "Terms of Use", "Jurisdiction"],
  FR: ["Langue", "Conditions d'utilisation", "Juridiction"],
};

export default function OnboardingSetup() {
  const { language, jurisdiction, usState, setLanguage, setJurisdiction, setUsState, completeOnboarding } = useUserProfile();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleComplete = async () => {
    await completeOnboarding();
    navigate("/", { replace: true });
  };

  const labels = STEP_LABELS[language] || STEP_LABELS.DE;

  const handleAdminSkip = async () => {
    await completeOnboarding();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-[#1a3560] flex items-center justify-center shadow-lg">
              <Scale className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-bold text-[17px] text-slate-900 tracking-tight">MachiavelLEX</span>
          </div>
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-0">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  s === step
                    ? "bg-[#1a3560] text-white"
                    : s < step
                    ? "bg-slate-200 text-slate-500"
                    : "bg-transparent text-slate-300"
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    s < step ? "bg-slate-400 text-white" : s === step ? "bg-white/20 text-white" : "bg-slate-200 text-slate-400"
                  }`}>{s}</span>
                  {labels[i]}
                </div>
                {i < 2 && <div className={`w-6 h-px ${s < step ? "bg-slate-300" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
          <button
            onClick={handleAdminSkip}
            className="mt-3 text-[10px] text-slate-300 hover:text-slate-500 transition-colors underline underline-offset-2"
          >
            Admin: Onboarding überspringen
          </button>
        </div>

        {step === 1 && (
          <LanguageStep language={language} onSelect={(lang) => { setLanguage(lang); setStep(2); }} onBack={() => {}} />
        )}
        {step === 2 && (
          <DisclaimerStep language={language} onAccept={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <JurisdictionStep
            jurisdiction={jurisdiction}
            usState={usState}
            language={language}
            onSelect={setJurisdiction}
            onSelectState={setUsState}
            onComplete={handleComplete}
            onBack={() => setStep(2)}
          />
        )}

        <p className="text-center text-[10px] text-slate-400 mt-4">
          MachiavelLEX · DSGVO-konform · EU-Server
        </p>
      </div>
    </div>
  );
}