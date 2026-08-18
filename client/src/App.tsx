import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { startLogin } from "@/const";
import { MunicipalityProvider } from "@/contexts/MunicipalityContext";
import AdminPages from "@/pages/AdminPages";
import { HomePage, IndicatorsPage, ServicesPage, TransparencyPage } from "@/pages/PublicPages";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";

function Router() {
  return <Switch>
    <Route path="/" component={HomePage} />
    <Route path="/indicadores" component={IndicatorsPage} />
    <Route path="/transparencia" component={TransparencyPage} />
    <Route path="/servicos" component={ServicesPage} />
    <Route path="/admin/tributos" component={AdminPages} />
    <Route path="/admin/tributos/arrecadacao" component={AdminPages} />
    <Route path="/admin/tributos/iptu" component={AdminPages} />
    <Route path="/admin/tributos/iss" component={AdminPages} />
    <Route path="/admin/tributos/itbi" component={AdminPages} />
    <Route path="/admin/tributos/inadimplencia" component={AdminPages} />
    <Route path="/admin/tributos/divida-ativa" component={AdminPages} />
    <Route path="/admin/:rest*?" component={AdminPages} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function SessionGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f8f7] text-[#173c40]"><Loader2 className="h-6 w-6 animate-spin text-[#0b7a73]" /></div>;
  if (user) return <MunicipalityProvider><Router /></MunicipalityProvider>;
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#073f46] p-6 text-white"><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:48px_48px]"/><section className="relative w-full max-w-xl rounded-[2rem] border border-white/15 bg-[#0c535c]/85 p-8 text-center shadow-2xl backdrop-blur sm:p-11"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#65d0c3]/20 text-[#9ce8df]"><Building2 className="h-7 w-7" /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-[#a9d8d2]">Acesso restrito</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em]">Painel Municipal seguro</h1><p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#c7e4e0]">Os dados municipais são disponibilizados somente após login e conforme os vínculos autorizados da sua conta.</p><Button onClick={startLogin} className="mt-8 h-11 rounded-full bg-white px-6 text-sm font-semibold text-[#075e66] hover:bg-[#e7f8f5]"><ShieldCheck className="mr-2 h-4 w-4"/>Entrar com segurança</Button></section></main>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><SessionGate /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
