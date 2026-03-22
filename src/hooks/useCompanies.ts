"use client";

import { useState, useEffect } from "react";

export interface CompanyOption {
  id: string;
  companyName: string;
  hederaAccountId: string;
  sector: string;
  emissionTier: string;
  carbonScore: string;
  did: string;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/companies");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCompanies(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { companies, loading, refresh };
}
