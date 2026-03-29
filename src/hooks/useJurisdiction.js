import { useState, useEffect } from "react";

const KEY = "machiavellex_jurisdiction";

export function useJurisdiction() {
  const [jurisdiction, setJurisdiction] = useState(() =>
    localStorage.getItem(KEY) || "DE"
  );

  const toggle = () => {
    const next = jurisdiction === "DE" ? "US" : "DE";
    localStorage.setItem(KEY, next);
    setJurisdiction(next);
  };

  const set = (j) => {
    localStorage.setItem(KEY, j);
    setJurisdiction(j);
  };

  return { jurisdiction, toggle, set };
}