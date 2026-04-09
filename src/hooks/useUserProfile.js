import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PROFILE = {
  language: "DE",
  jurisdiction: "DE",
  usState: "CA",
  disclaimerAccepted: false,
  onboardingDone: false,
  hasModuleAccess: false,
  kiCredits: 0,
};

export function useUserProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    base44.auth.isAuthenticated().then(authed => {
      if (!authed) {
        if (!cancelled) setIsLoading(false);
        return null;
      }
      return base44.auth.me();
    }).then(user => {
      if (cancelled) return;
      if (user) {
        setProfile({
          language: user.language || DEFAULT_PROFILE.language,
          jurisdiction: user.jurisdiction || DEFAULT_PROFILE.jurisdiction,
          usState: user.usState || DEFAULT_PROFILE.usState,
          disclaimerAccepted: user.disclaimerAccepted || false,
          onboardingDone: user.onboardingDone || false,
          hasModuleAccess: user.hasModuleAccess || false,
          kiCredits: user.kiCredits || 0,
        });
      }
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const setLanguage = (lang) => setProfile(p => ({ ...p, language: lang }));
  const setJurisdiction = (jur) => setProfile(p => ({ ...p, jurisdiction: jur }));
  const setUsState = (state) => setProfile(p => ({ ...p, usState: state }));

  const completeOnboarding = async () => {
    const updated = { ...profile, disclaimerAccepted: true, onboardingDone: true };
    setProfile(updated);
    await base44.auth.updateMe({
      language: updated.language,
      jurisdiction: updated.jurisdiction,
      usState: updated.usState,
      disclaimerAccepted: true,
      onboardingDone: true,
    });
  };

  return {
    ...profile,
    isLoadingProfile: isLoading,
    setLanguage,
    setJurisdiction,
    setUsState,
    completeOnboarding,
  };
}