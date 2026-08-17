import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMunicipality } from "@/contexts/MunicipalityContext";
import { trpc } from "@/lib/trpc";
import { selectCreatedMunicipality } from "@/lib/municipalitySelection";
import { resolveMunicipalityCreation } from "@/lib/municipalityCreationFlow";
import { applyMunicipalityCreationSuccess } from "@/lib/municipalityCreationHandler";
import { Building2, Check, Copy, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

type MunicipalRole = "viewer" | "editor" | "admin";

const roleLabels: Record<MunicipalRole, string> = { viewer: "Consulta", editor: "Gestão de dados", admin: "Administração" };

export function handleMunicipalityCreatedInInterface(input: {
  current: Array<{ id: string; name: string; state: string; population: number | null }> | undefined;
  municipality: { id: string; name: string; state: string; population: number | null; integrationToken: string };
  setMunicipalities: (municipalities: Array<{ id: string; name: string; state: string; population: number | null }>) => void;
  selectMunicipality: (tenantId: string) => void;
  setToken: (token: string) => void;
  setTokenMunicipalityName: (name: string) => void;
}) {
  return applyMunicipalityCreationSuccess({ current: input.current, created: input.municipality, setMunicipalities: input.setMunicipalities, selectMunicipality: input.selectMunicipality, revealToken: (token, municipalityName) => { input.setToken(token); input.setTokenMunicipalityName(municipalityName); } });
}

export function TokenRevealDialog({ token, municipalityName, onClose }: { token: string | null; municipalityName?: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success("Token copiado para a área de transferência.");
  };
  return <Dialog open={Boolean(token)} onOpenChange={open => !open && onClose()}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#0b7a73]" /> Token de integração criado</DialogTitle></DialogHeader><div className="space-y-5 py-2"><div className="rounded-2xl border border-[#b8e1db] bg-[#effaf8] p-4 text-sm leading-6 text-[#35666a]"><strong className="text-[#173c40]">{municipalityName ?? "Esta prefeitura"}</strong> recebeu um token exclusivo. Copie-o agora e mantenha-o somente no exportador autorizado. Por segurança, o valor completo não será exibido novamente.</div><div className="space-y-2"><Label>Token municipal</Label><div className="flex gap-2"><Input value={token ?? ""} readOnly className="font-mono text-xs" /><Button type="button" onClick={() => void copyToken()} variant="outline" className="shrink-0">{copied ? <Check className="mr-2 h-4 w-4"/> : <Copy className="mr-2 h-4 w-4"/>}{copied ? "Copiado" : "Copiar"}</Button></div></div><div className="rounded-xl bg-[#f5f8f7] p-3 text-xs leading-5 text-[#657d80]">Envie este valor no campo <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-[#0b6672]">integrationToken</code> do JSON para que o painel determine automaticamente a prefeitura de destino.</div></div><DialogFooter><Button onClick={onClose} className="bg-[#0b6672]">Concluí o armazenamento seguro</Button></DialogFooter></DialogContent></Dialog>;
}

export default function MunicipalityAccessSetup() {
  const { municipalities, tenantId, activeMunicipality, selectMunicipality } = useMunicipality();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenMunicipalityName, setTokenMunicipalityName] = useState<string>();
  const [municipalityForm, setMunicipalityForm] = useState({ name: "", state: "", population: "" });
  const [userForm, setUserForm] = useState({ email: "", role: "viewer" as MunicipalRole });
  const input = useMemo(() => ({ tenantId: tenantId ?? "" }), [tenantId]);
  const authorizedUsers = trpc.municipal.admin.authorizedUsers.useQuery(input, { enabled: Boolean(tenantId) });
  const tokenInfo = trpc.municipal.admin.integrationTokenInfo.useQuery(input, { enabled: Boolean(tenantId) });

  const createMunicipality = trpc.municipal.admin.createMunicipality.useMutation({
    onSuccess: municipality => {
      const newMunicipality = { id: municipality.id, name: municipality.name, state: municipality.state, population: municipality.population };
      handleMunicipalityCreatedInInterface({ current: utils.municipal.public.municipalities.getData(), municipality: { ...newMunicipality, integrationToken: municipality.integrationToken }, setMunicipalities: municipalities => utils.municipal.public.municipalities.setData(undefined, municipalities), selectMunicipality, setToken, setTokenMunicipalityName });
      void utils.municipal.public.municipalities.invalidate();
      setCreateOpen(false);
      setMunicipalityForm({ name: "", state: "", population: "" });
      toast.success("Prefeitura cadastrada e selecionada como contexto ativo.");
    },
    onError: error => toast.error(error.message),
  });
  const authorizeUser = trpc.municipal.admin.authorizeUser.useMutation({
    onSuccess: result => {
      void authorizedUsers.refetch();
      setUserOpen(false);
      setUserForm({ email: "", role: "viewer" });
      toast.success(result.status === "active" ? "Usuário vinculado imediatamente." : "Usuário autorizado. O vínculo será ativado no primeiro login com este e-mail.");
    },
    onError: error => toast.error(error.message),
  });
  const removeAuthorizedUser = trpc.municipal.admin.removeAuthorizedUser.useMutation({
    onSuccess: () => { void authorizedUsers.refetch(); toast.success("Usuário autorizado removido."); },
    onError: error => toast.error(error.message),
  });
  const regenerateToken = trpc.municipal.admin.regenerateIntegrationToken.useMutation({
    onSuccess: result => {
      setToken(result.integrationToken);
      setTokenMunicipalityName(activeMunicipality?.name);
      void tokenInfo.refetch();
      toast.success("Novo token gerado. O token anterior foi revogado.");
    },
    onError: error => toast.error(error.message),
  });

  const submitMunicipality = () => createMunicipality.mutate({ name: municipalityForm.name, state: municipalityForm.state, population: municipalityForm.population ? Number(municipalityForm.population) : undefined });
  const submitAuthorizedUser = () => tenantId && authorizeUser.mutate({ tenantId, email: userForm.email, role: userForm.role });

  return <>
    <TokenRevealDialog token={token} municipalityName={tokenMunicipalityName} onClose={() => setToken(null)} />
    <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#0b7a73]">Administração de acesso</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em] text-[#173c40] sm:text-4xl">Prefeituras, usuários e integração</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#687f82]">Cadastre uma prefeitura, autorize pessoas pelo e-mail de login e entregue o token exclusivo ao exportador de dados.</p></div><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button className="bg-[#0b6672]"><Plus className="mr-2 h-4 w-4"/>Nova prefeitura</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Nova prefeitura</DialogTitle></DialogHeader><div className="grid gap-4 py-3"><div className="space-y-2"><Label>Nome da prefeitura</Label><Input value={municipalityForm.name} onChange={event => setMunicipalityForm({ ...municipalityForm, name: event.target.value })} placeholder="Prefeitura de Exemplo" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={municipalityForm.state} onChange={event => setMunicipalityForm({ ...municipalityForm, state: event.target.value.toUpperCase() })} placeholder="PR" /></div><div className="space-y-2"><Label>População</Label><Input type="number" value={municipalityForm.population} onChange={event => setMunicipalityForm({ ...municipalityForm, population: event.target.value })} placeholder="0" /></div></div></div><DialogFooter><Button disabled={createMunicipality.isPending} onClick={submitMunicipality} className="bg-[#0b6672]">Criar prefeitura e token</Button></DialogFooter></DialogContent></Dialog></div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{municipalities.map(municipality => <button key={municipality.id} onClick={() => selectMunicipality(municipality.id)} className={`rounded-2xl border p-6 text-left shadow-[0_10px_24px_rgba(15,68,72,.04)] transition hover:-translate-y-0.5 ${municipality.id === tenantId ? "border-[#64cabc] bg-[#effaf8]" : "border-[#dce9e7] bg-white hover:border-[#a9d7d1]"}`}><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4f3f0] text-[#087069]"><Building2 className="h-5 w-5"/></span><Badge className="border-0 bg-[#eff6f5] text-[#087069]">{municipality.state}</Badge></div><h2 className="mt-6 font-display text-xl font-semibold tracking-[-.03em] text-[#173c40]">{municipality.name}</h2><p className="mt-2 text-sm text-[#71878a]">{municipality.population ? `${new Intl.NumberFormat("pt-BR").format(municipality.population)} habitantes` : "População não informada"}</p>{municipality.id === tenantId && <p className="mt-4 text-xs font-bold text-[#087069]">Contexto ativo</p>}</button>)}</div>

    {!tenantId ? <Card className="mt-6 border-[#dce9e7]"><CardContent className="p-7 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#0b7a73]"/><h2 className="mt-4 font-display text-2xl font-semibold text-[#173c40]">Cadastre ou selecione uma prefeitura</h2><p className="mt-2 text-sm text-[#71878a]">A gestão de e-mails autorizados e o token de integração serão disponibilizados após a definição da prefeitura ativa.</p></CardContent></Card> : <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <Card className="border-[#dce9e7] bg-[#073f46] text-white"><CardContent className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9ed2ca]">Integração JSON</p><h2 className="mt-2 font-display text-2xl font-semibold">Token da prefeitura</h2><p className="mt-3 text-sm leading-6 text-[#c5e2de]">O exportador deve enviar o token no campo <code className="rounded bg-white/10 px-1.5 py-0.5">integrationToken</code>. O painel identificará a prefeitura sem depender de IDs informados pelo cliente.</p></div><KeyRound className="h-6 w-6 text-[#8ce3d8]" /></div><div className="mt-6 rounded-xl bg-white/10 p-4"><p className="text-xs text-[#c5e2de]">Token configurado: <strong className="text-white">{tokenInfo.data?.tokenConfigured ? `final ${tokenInfo.data.tokenHint}` : "não configurado"}</strong></p></div><Button disabled={regenerateToken.isPending} onClick={() => regenerateToken.mutate({ tenantId })} variant="outline" className="mt-5 border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"><RefreshCw className="mr-2 h-4 w-4"/>Gerar novo token</Button></CardContent></Card>
      <Card className="border-[#dce9e7] bg-white"><CardContent className="p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0b7a73]">Acesso por e-mail</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#173c40]">Usuários autorizados</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#71878a]">Cadastre o e-mail antes do primeiro login. Quando a pessoa entrar com o mesmo e-mail, o vínculo municipal será ativado automaticamente.</p></div><Dialog open={userOpen} onOpenChange={setUserOpen}><DialogTrigger asChild><Button className="bg-[#0b6672]"><UserPlus className="mr-2 h-4 w-4"/>Autorizar usuário</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Autorizar usuário por e-mail</DialogTitle></DialogHeader><div className="grid gap-4 py-3"><div className="space-y-2"><Label>E-mail usado no login</Label><Input type="email" value={userForm.email} onChange={event => setUserForm({ ...userForm, email: event.target.value })} placeholder="pessoa@prefeitura.gov.br" /></div><div className="space-y-2"><Label>Perfil municipal</Label><Select value={userForm.role} onValueChange={value => setUserForm({ ...userForm, role: value as MunicipalRole })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Consulta</SelectItem><SelectItem value="editor">Gestão de dados</SelectItem><SelectItem value="admin">Administração</SelectItem></SelectContent></Select></div></div><DialogFooter><Button disabled={authorizeUser.isPending} onClick={submitAuthorizedUser} className="bg-[#0b6672]">Salvar autorização</Button></DialogFooter></DialogContent></Dialog></div>{authorizedUsers.isLoading ? <p className="mt-6 text-sm text-[#71878a]">Carregando usuários autorizados...</p> : authorizedUsers.data?.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-[#f4f8f7] text-[10px] font-bold uppercase tracking-[.12em] text-[#71878a]"><tr><th className="px-3 py-3">Pessoa</th><th className="px-3 py-3">E-mail</th><th className="px-3 py-3">Perfil</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3" /></tr></thead><tbody>{authorizedUsers.data.map(user => <tr key={user.id} className="border-t border-[#edf3f2] text-sm"><td className="px-3 py-3 font-semibold text-[#173c40]">{user.name || "Aguardando primeiro login"}</td><td className="px-3 py-3 text-[#61787b]">{user.email}</td><td className="px-3 py-3"><Badge className="border-0 bg-[#eef6f5] text-[#087069]">{roleLabels[user.role]}</Badge></td><td className="px-3 py-3"><Badge className={`border-0 ${user.status === "active" ? "bg-[#e7f4ea] text-[#307651]" : "bg-[#fff1e4] text-[#b95c26]"}`}>{user.status === "active" ? "Ativo" : "Aguardando login"}</Badge></td><td className="px-3 py-3 text-right"><Button variant="ghost" size="sm" disabled={removeAuthorizedUser.isPending} onClick={() => removeAuthorizedUser.mutate({ tenantId, authorizationId: user.id })} className="text-[#b4564e] hover:bg-[#fff0ee] hover:text-[#97423c]"><Trash2 className="mr-1.5 h-3.5 w-3.5"/>Remover</Button></td></tr>)}</tbody></table></div> : <p className="mt-6 rounded-xl bg-[#f4f8f7] p-4 text-sm text-[#71878a]">Nenhum e-mail foi autorizado para esta prefeitura.</p>}</CardContent></Card>
    </div>}
  </>;
}
