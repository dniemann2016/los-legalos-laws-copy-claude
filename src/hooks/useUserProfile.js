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

let _profile = null;
let _loading = true;
let _setters = [];
let _loadingSetters = [];

function notifyLoadingAll() {
  _loadingSetters.forEach(fn => fn(_loading));
}

function notifyAll() {
  _setters.forEach(fn => fn({ ..._profile }));
}


export function useUserProfile() {
  const [profile, setProfile] = useState(_profile || DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(_loading);

  useEffect(() => {
    _setters.push(setProfile);
    _loadingSetters.push(setIsLoading);

    if (_loading) {
      base44.auth.isAuthenticated().then(authed => {
        if (!authed) {
          _loading = false;
          notifyLoadingAll();
          return null;
        }
        return base44.auth.me();
      }).then(user => {
        if (user) {
          _profile = {
            language: user.language || DEFAULT_PROFILE.language,
            jurisdiction: user.jurisdiction || DEFAULT_PROFILE.jurisdiction,
            usState: user.usState || DEFAULT_PROFILE.usState,
            disclaimerAccepted: user.disclaimerAccepted || false,
            onboardingDone: user.onboardingDone || false,
            hasModuleAccess: user.hasModuleAccess || false,
            kiCredits: user.kiCredits || 0,
          };
          notifyAll();
        }
        _loading = false;
        notifyLoadingAll();
      }).catch(() => {
        _loading = false;
        notifyLoadingAll();
      });
    }

    return () => {
      _setters = _setters.filter(fn => fn !== setProfile);
      _loadingSetters = _loadingSetters.filter(fn => fn !== setIsLoading);
    };
  }, []);

  const setLanguage = (lang) => {
    _profile = { ..._profile, language: lang };
    notifyAll();
  };

  const setJurisdiction = (jur) => {
    _profile = { ..._profile, jurisdiction: jur };
    notifyAll();
  };

  const setUsState = (state) => {
    _profile = { ..._profile, usState: state };
    notifyAll();
  };

  const completeOnboarding = async () => {
    const updated = {
      ..._profile,
      disclaimerAccepted: true,
      onboardingDone: true,
    };
    _profile = updated;
    notifyAll();
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