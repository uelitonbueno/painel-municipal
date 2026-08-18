import { useMunicipality } from "@/contexts/MunicipalityContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, LayoutDashboard, Menu, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const links = [
  { label: "Visão geral", href: "/" },
  { label: "Indicadores", href: "/indicadores" },
  { label: "Transparência", href: "/transparencia" },
  { label: "Serviços", href: "/servicos" },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-foreground">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-[#0b7a73] text-white shadow-[0_10px_24px_rgba(49,46,129,0.28)]">
        <Building2 className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-semibold tracking-[-0.03em]">Painel Municipal</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a5b4fc]">Dados que aproximam</span>
      </span>
    </Link>
  );
}

export function MunicipalitySwitcher({ compact = false }: { compact?: boolean }) {
  const { municipalities, tenantId, selectMunicipality, error, retry } = useMunicipality();
  if (error) return <Button variant="outline" onClick={retry} className={compact ? "h-9 border-[#e3c9c4] text-xs text-[#a95049]" : "h-10 border-[#e3c9c4] text-xs text-[#a95049]"}><RefreshCw className="mr-2 h-3.5 w-3.5"/>Recarregar prefeituras</Button>;
  if (!municipalities.length) return null;
  return (
    <Select value={tenantId} onValueChange={selectMunicipality}>
      <SelectTrigger className={compact ? "h-9 border-[#334155] bg-[#0f172a] text-xs text-slate-100" : "h-10 min-w-[190px] border-[#334155] bg-[#0f172a] text-xs text-slate-100 shadow-sm"}>
        <SelectValue placeholder="Selecionar prefeitura" />
      </SelectTrigger>
      <SelectContent>
        {municipalities.map(municipality => (
          <SelectItem key={municipality.id} value={municipality.id}>{municipality.name} · {municipality.state}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  return (
    <div className="municipal-public min-h-screen bg-[#f5f8f7] text-[#173c40]">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#090d16]/92 backdrop-blur-xl">
        <div className="container flex h-[74px] items-center justify-between gap-5">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação autenticada">
            {links.map(link => (
              <Link key={link.href} href={link.href} className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${location === link.href ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <MunicipalitySwitcher />
            <Link href="/admin">
              <Button className="h-10 rounded-full bg-gradient-to-r from-indigo-600 to-[#0b7a73] px-4 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,.22)] hover:from-indigo-500 hover:to-[#0b8f86]">
                Gestão municipal
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => void logout()} className="h-10 px-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white">Sair</Button>
          </div>
          <button onClick={() => setIsMenuOpen(open => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-indigo-200 md:hidden" aria-label="Abrir menu">
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="border-t border-slate-800 bg-[#0d1422] px-4 py-4 md:hidden">
            <nav className="mx-auto grid max-w-xl gap-1" aria-label="Navegação autenticada móvel">
              {links.map(link => <Link key={link.href} onClick={() => setIsMenuOpen(false)} href={link.href} className={`rounded-lg px-3 py-2.5 text-sm ${location === link.href ? "bg-indigo-500/20 font-semibold text-indigo-100" : "text-slate-400"}`}>{link.label}</Link>)}
              <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4"><MunicipalitySwitcher compact /><Link href="/admin"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-500">Gestão municipal</Button></Link><Button size="sm" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => void logout()}>Sair</Button></div>
            </nav>
          </div>
        )}
      </header>
      {children}
      <footer className="mt-16 border-t border-slate-800 bg-[#090d16]">
        <div className="container flex flex-col gap-4 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-300" /> Dados acessíveis somente em sessão autenticada.</div>
          <div className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> {user?.role === "admin" ? "Superusuário · visão ampliada" : "Prefeitura vinculada · acesso controlado"}</div>
        </div>
      </footer>
    </div>
  );
}
