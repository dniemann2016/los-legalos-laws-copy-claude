import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const DEFAULT_PROFILE = {
  language: "DE",
  jurisdiction: "DE",
  usState: "CA",
  disclaimerAccepted: false,
  onboardingDone: false,
};

let _profile = null;
let _setters = [];

function notifyAll() {
  _setters.forEach(fn => fn({ ..._profile }));
}

export function useUserProfile() {
  const [profile, setProfile] = useState(_profile || DEFAULT_PROFILE);

  useEffect(() => {
    _setters.push(setProfile);
    if (!_profile) {
      base44.auth.isAuthenticated().then(authed => {
        if (!authed) return;
        return base44.auth.me();
      }).then(user => {
        if (user) {
          _profile = {
            language: user.language || DEFAULT_PROFILE.language,
            jurisdiction: user.jurisdiction || DEFAULT_PROFILE.jurisdiction,
            usState: user.usState || DEFAULT_PROFILE.usState,
            disclaimerAccepted: user.disclaimerAccepted || false,
            onboardingDone: user.onboardingDone || false,
          };
          notifyAll();
        }
      }).catch(() => {});
    }
    return () => {
      _setters = _setters.filter(fn => fn !== setProfile);
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
    setLanguage,
    setJurisdiction,
    setUsState,
    completeOnboarding,
  };
}