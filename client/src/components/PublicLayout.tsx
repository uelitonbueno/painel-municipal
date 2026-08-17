import { useMunicipality } from "@/contexts/MunicipalityContext";
import { Button } from "@/components/ui/button";
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
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#073f46] text-white shadow-[0_10px_24px_rgba(7,63,70,0.24)]">
        <Building2 className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-semibold tracking-[-0.03em]">Painel Municipal</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f777b]">Dados que aproximam</span>
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
      <SelectTrigger className={compact ? "h-9 border-[#dbe9e8] bg-white text-xs" : "h-10 min-w-[190px] border-[#dbe9e8] bg-white text-xs shadow-sm"}>
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
  return (
    <div className="min-h-screen bg-[#f5f8f7] text-[#173c40]">
      <header className="sticky top-0 z-50 border-b border-[#dbe9e8]/80 bg-[#f5f8f7]/92 backdrop-blur-xl">
        <div className="container flex h-[74px] items-center justify-between gap-5">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação pública">
            {links.map(link => (
              <Link key={link.href} href={link.href} className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${location === link.href ? "bg-[#e0f0ee] text-[#075e66]" : "text-[#587073] hover:bg-white hover:text-[#173c40]"}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <MunicipalitySwitcher />
            <Link href="/admin">
              <Button className="h-10 rounded-full bg-[#0b6672] px-4 text-xs font-semibold hover:bg-[#075e66]">
                Área administrativa
              </Button>
            </Link>
          </div>
          <button onClick={() => setIsMenuOpen(open => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#dbe9e8] bg-white text-[#0b6672] md:hidden" aria-label="Abrir menu">
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="border-t border-[#dbe9e8] bg-white px-4 py-4 md:hidden">
            <nav className="mx-auto grid max-w-xl gap-1" aria-label="Navegação pública móvel">
              {links.map(link => <Link key={link.href} onClick={() => setIsMenuOpen(false)} href={link.href} className={`rounded-lg px-3 py-2.5 text-sm ${location === link.href ? "bg-[#e0f0ee] font-semibold text-[#075e66]" : "text-[#587073]"}`}>{link.label}</Link>)}
              <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-[#e7f0ef] pt-4"><MunicipalitySwitcher compact /><Link href="/admin"><Button size="sm" className="bg-[#0b6672]">Área administrativa</Button></Link></div>
            </nav>
          </div>
        )}
      </header>
      {children}
      <footer className="mt-16 border-t border-[#dbe9e8] bg-white">
        <div className="container flex flex-col gap-4 py-8 text-xs text-[#627a7d] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0b7a73]" /> Informações públicas organizadas para consulta cidadã.</div>
          <div className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Painel Municipal · gestão com responsabilidade</div>
        </div>
      </footer>
    </div>
  );
}
