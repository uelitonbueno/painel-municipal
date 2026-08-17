import { Button } from "@/components/ui/button";
import { ArrowRight, DatabaseZap, FileQuestion, Loader2 } from "lucide-react";
import { Link } from "wouter";

export function LoadingBlock({ label = "Carregando informações" }: { label?: string }) {
  return <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#cddfdd] bg-white/70 p-8 text-center text-sm text-[#647b7e]"><div><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#0b7a73]" />{label}</div></div>;
}

export function EmptyPublicState({ title = "Ainda não há dados publicados", description = "Assim que a prefeitura atualizar esta área, as informações estarão disponíveis para consulta aqui." }: { title?: string; description?: string }) {
  return <div className="rounded-2xl border border-dashed border-[#c8ddda] bg-[#fbfdfc] p-8 text-center"><FileQuestion className="mx-auto mb-3 h-7 w-7 text-[#0b7a73]" /><h3 className="font-display text-lg font-semibold text-[#173c40]">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#627a7d]">{description}</p></div>;
}

export function QueryErrorState({ onRetry, title = "Não foi possível consultar os dados", description = "Houve uma indisponibilidade temporária. Verifique sua conexão e tente novamente." }: { onRetry: () => void; title?: string; description?: string }) {
  return <div className="rounded-2xl border border-[#f0d7d3] bg-[#fffafa] p-8 text-center"><FileQuestion className="mx-auto mb-3 h-7 w-7 text-[#b85c54]" /><h3 className="font-display text-lg font-semibold text-[#173c40]">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#627a7d]">{description}</p><Button variant="outline" className="mt-5 border-[#e4c8c3] text-[#a95049] hover:bg-[#fff3f1] hover:text-[#8d403a]" onClick={onRetry}>Tentar novamente</Button></div>;
}

export function EmptyAdminState({ title = "Cadastre a primeira prefeitura", description = "A área de consulta autenticada será habilitada para usuários vinculados assim que os dados oficiais forem incluídos." }: { title?: string; description?: string }) {
  return <div className="rounded-2xl border border-[#cfe2df] bg-white p-8 shadow-[0_12px_30px_rgba(20,74,76,0.06)]"><DatabaseZap className="mb-4 h-8 w-8 text-[#0b7a73]" /><h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[#173c40]">{title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#627a7d]">{description}</p><Link href="/admin/prefeituras"><Button className="mt-5 bg-[#0b6672]">Cadastrar prefeitura <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>;
}
