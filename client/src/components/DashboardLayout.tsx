import { useAuth } from "@/_core/hooks/useAuth";
import { useMunicipality } from "@/contexts/MunicipalityContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, Building2, FileText, LayoutDashboard, LogOut, PanelLeft, ReceiptText, Settings2, ShieldAlert, Target, UsersRound, Wrench } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/admin" },
  { icon: Target, label: "Metas e projetos", path: "/admin/projetos" },
  { icon: BarChart3, label: "Indicadores", path: "/admin/indicadores" },
  { icon: FileText, label: "Transparência", path: "/admin/transparencia" },
  { icon: Wrench, label: "Serviços", path: "/admin/servicos" },
  { icon: ReceiptText, label: "Recebimentos", path: "/admin/recebimentos" },
];
const SIDEBAR_WIDTH_KEY = "painel-municipal.sidebar-width";
const DEFAULT_WIDTH = 270;
const MIN_WIDTH = 220;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="grid min-h-screen place-items-center bg-[#f5f8f7] p-5"><div className="w-full max-w-md rounded-3xl border border-[#d7e7e5] bg-white p-8 text-center shadow-[0_24px_70px_rgba(12,76,77,0.12)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e3f3ef] text-[#0b7a73]"><Building2 className="h-6 w-6" /></span><h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.04em] text-[#173c40]">Gestão municipal</h1><p className="mt-3 text-sm leading-6 text-[#61787b]">A área administrativa é protegida. Entre com sua conta para consultar ou atualizar informações da prefeitura.</p><Button onClick={() => startLogin()} className="mt-7 w-full bg-[#0b6672]">Entrar no painel</Button><Link href="/" className="mt-4 block text-xs font-semibold text-[#0b7a73]">Voltar para a consulta autenticada</Link></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardContent setSidebarWidth={setSidebarWidth}>{children}</DashboardContent></SidebarProvider>;
}

function DashboardContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth(); const { activeMunicipality } = useMunicipality(); const [location] = useLocation(); const { state, toggleSidebar } = useSidebar(); const [isResizing, setIsResizing] = useState(false); const sidebarRef = useRef<HTMLDivElement>(null); const isMobile = useIsMobile(); const isCollapsed = state === "collapsed";
  useEffect(() => { const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left ?? 0; const width = event.clientX - left; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); }; const stop = () => setIsResizing(false); if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", stop); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; } return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", stop); document.body.style.cursor = ""; document.body.style.userSelect = ""; }; }, [isResizing, setSidebarWidth]);
  const active = menuItems.find(item => item.path === location)?.label ?? (location === "/admin/prefeituras" ? "Prefeituras" : "Painel");
  return <><div className="relative" ref={sidebarRef}><Sidebar collapsible="icon" className="border-r-0 bg-[#073f46] text-[#dff3ef]" disableTransition={isResizing}><SidebarHeader className="h-auto p-4"><div className="flex items-center gap-3"><button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 rounded-lg bg-white/10 text-white transition hover:bg-white/15" aria-label="Alternar navegação"><PanelLeft className="h-4 w-4"/></button>{!isCollapsed && <Link href="/admin" className="min-w-0"><p className="truncate font-display text-lg font-semibold tracking-[-0.03em] text-white">Painel Municipal</p><p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[.14em] text-[#9ed2ca]">Gestão e transparência</p></Link>}</div>{!isCollapsed && <div className="mt-5 rounded-xl border border-white/10 bg-white/[.07] p-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9ed2ca]">Prefeitura ativa</p><p className="mt-1 truncate text-xs font-semibold text-white">{activeMunicipality ? `${activeMunicipality.name} · ${activeMunicipality.state}` : "Nenhuma selecionada"}</p></div>}</SidebarHeader><SidebarContent className="gap-0"><SidebarMenu className="px-3 py-2">{menuItems.map(item => <SidebarMenuItem key={item.path}><Link href={item.path}><SidebarMenuButton isActive={location === item.path} tooltip={item.label} className="h-10 text-[#c8e3df] hover:bg-white/10 hover:text-white data-[active=true]:bg-[#77d4c8] data-[active=true]:text-[#073f46]"><item.icon className="h-4 w-4"/><span>{item.label}</span></SidebarMenuButton></Link></SidebarMenuItem>)}</SidebarMenu><div className="mx-3 mt-4 border-t border-white/10 pt-4"><Link href="/admin/prefeituras"><SidebarMenuButton isActive={location === "/admin/prefeituras"} tooltip="Prefeituras" className="h-10 text-[#c8e3df] hover:bg-white/10 hover:text-white data-[active=true]:bg-[#77d4c8] data-[active=true]:text-[#073f46]"><UsersRound className="h-4 w-4"/><span>Prefeituras</span></SidebarMenuButton></Link><Link href="/"><SidebarMenuButton tooltip="Consulta autenticada" className="mt-1 h-10 text-[#c8e3df] hover:bg-white/10 hover:text-white"><Settings2 className="h-4 w-4"/><span>Consulta autenticada</span></SidebarMenuButton></Link></div></SidebarContent><SidebarFooter className="p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"><Avatar className="h-8 w-8 border border-white/20"><AvatarFallback className="bg-[#75cfc4] text-xs font-bold text-[#073f46]">{user?.name?.charAt(0).toUpperCase() ?? "A"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-white">{user?.name || "Administrador"}</p><p className="mt-0.5 truncate text-[10px] text-[#9ed2ca]">Administrador</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4"/>Sair do painel</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition hover:bg-[#77d4c8]/50 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} style={{ zIndex: 50 }}/></div><SidebarInset className="bg-[#f5f8f7]">{isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[#dbe9e8] bg-[#f5f8f7]/95 px-3 backdrop-blur"><SidebarTrigger className="h-9 w-9 rounded-lg bg-white"/><p className="font-display text-lg font-semibold text-[#173c40]">{active}</p></div>}<main className="min-h-screen p-4 md:p-7 lg:p-9">{children}</main></SidebarInset></>;
}
