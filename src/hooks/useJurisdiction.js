import { useState } from "react";

export function useJurisdiction() {
  const [jurisdiction, setJurisdiction] = useState(
    () => localStorage.getItem("jurisdiction") || "DE"
  );

  const set = (jur) => {
    setJurisdiction(jur);
    localStorage.setItem("jurisdiction", jur);
  };

  const toggle = () => set(jurisdiction === "DE" ? "US" : "DE");

  return { jurisdiction, set, toggle };
}