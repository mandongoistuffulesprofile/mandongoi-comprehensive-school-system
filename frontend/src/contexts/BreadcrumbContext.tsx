import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface CrumbOverride {
  label: string;
  link?: string;
}

interface BreadcrumbContextType {
  overrides: Record<string, CrumbOverride>;
  setOverride: (key: string, override: CrumbOverride) => void;
  clearOverride: (key: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbOverrideProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, CrumbOverride>>({});

  const setOverride = useCallback((key: string, override: CrumbOverride) => {
    setOverrides((prev) => ({ ...prev, [key]: override }));
  }, []);

  const clearOverride = useCallback((key: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ overrides, setOverride, clearOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbOverride() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbOverride must be used within BreadcrumbOverrideProvider");
  }
  return ctx;
}
