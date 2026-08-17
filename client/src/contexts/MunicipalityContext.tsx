import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type MunicipalityContextValue = {
  municipalities: Array<{ id: string; name: string; state: string; population: number | null }>;
  tenantId: string | undefined;
  activeMunicipality: { id: string; name: string; state: string; population: number | null } | undefined;
  selectMunicipality: (id: string) => void;
  loading: boolean;
  error: boolean;
  retry: () => void;
};

const MunicipalityContext = createContext<MunicipalityContextValue | undefined>(undefined);
const STORAGE_KEY = "painel-municipal.active-municipality";

export function MunicipalityProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, refetch } = trpc.municipal.public.municipalities.useQuery();
  const municipalities = data ?? [];
  const [tenantId, setTenantId] = useState<string | undefined>(() => localStorage.getItem(STORAGE_KEY) ?? undefined);

  useEffect(() => {
    if (!municipalities.length) {
      setTenantId(undefined);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const valid = municipalities.some(municipality => municipality.id === tenantId);
    if (!valid) setTenantId(municipalities[0]?.id);
  }, [municipalities, tenantId]);

  const selectMunicipality = (id: string) => {
    setTenantId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const value = useMemo(
    () => ({
      municipalities,
      tenantId,
      activeMunicipality: municipalities.find(municipality => municipality.id === tenantId),
      selectMunicipality,
      loading: isLoading,
      error: isError,
      retry: () => { void refetch(); },
    }),
    [municipalities, tenantId, isLoading, isError, refetch],
  );

  return <MunicipalityContext.Provider value={value}>{children}</MunicipalityContext.Provider>;
}

export function useMunicipality() {
  const context = useContext(MunicipalityContext);
  if (!context) throw new Error("useMunicipality deve ser utilizado dentro de MunicipalityProvider");
  return context;
}
