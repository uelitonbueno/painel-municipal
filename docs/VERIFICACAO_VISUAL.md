# Verificação visual — Painel Municipal

## Escopo verificado

As rotas públicas `/` e `/transparencia`, além da entrada administrativa `/admin`, foram verificadas em viewport desktop de 1280×720. As rotas públicas `/` e `/transparencia` também foram verificadas em viewport móvel de 375×812.

## Resultado

| Área | Desktop | Mobile | Observação |
|---|---|---|---|
| Visão geral pública | Aprovada | Aprovada | Hierarquia tipográfica, cards, seções e estados vazios permanecem legíveis. |
| Transparência pública | Aprovada | Aprovada | Os filtros passam a uma coluna no mobile, preservando espaçamento e leitura. |
| Painel administrativo | Aprovado | Aprovado | No mobile, o cabeçalho compacto e o estado inicial permanecem legíveis, sem corte horizontal. |

> A interface pública está preparada para exibir dados reais assim que uma prefeitura for cadastrada e seus registros forem publicados. Os estados vazios são intencionais e não representam falha de consulta.

## Consolidação final

Foram verificadas as rotas `/`, `/transparencia` e `/admin` nas resoluções de 1280×720 e 375×812. Na revisão do painel administrativo em 375×812, o cabeçalho compacto, o cartão de estado inicial e o botão de cadastro permaneceram visíveis, sem corte horizontal ou falha de responsividade.

## Revisão de acesso autenticado

Após o reforço de segurança, a rota principal autenticada foi verificada em desktop e mobile com a conta de superusuário sem prefeitura cadastrada. A tela apresentou claramente o estado **“Nenhuma prefeitura vinculada”**, sem carregar cards, indicadores ou registros municipais. A rota administrativa também foi verificada em mobile, mantendo o fluxo de cadastro inicial legível e sem corte horizontal.

> Resultado da revisão: a experiência autenticada informa a ausência de vínculo sem expor dados de nenhuma prefeitura. A consulta de dados só será carregada quando existir uma prefeitura autorizada no contexto da sessão.

## Administração de acessos e integração

A rota `/admin/prefeituras` foi verificada em desktop e em 375×812. A tela de cadastro de prefeitura, usuários autorizados por e-mail e token de integração preserva a hierarquia visual, o botão de criação e o estado sem prefeitura sem corte horizontal em dispositivos móveis.

## BI Tributário — Fase 1

As rotas `/admin/tributos`, `/admin/tributos/arrecadacao` e `/admin/tributos/divida-ativa` foram verificadas em desktop. Os filtros de período e bairro, a identificação da prefeitura ativa e o estado de espera por dados tributários foram renderizados corretamente. A ausência de gráficos e métricas neste momento é intencional: os painéis não utilizam dados fictícios e aguardam cargas reais do recurso `tributos.lancamentos` autenticadas pelo token da prefeitura.

Após o ajuste de densidade da sidebar, os sete módulos tributários permanecem visíveis na navegação desktop, incluindo o atalho ativo de **Dívida Ativa**, sem sobreposição com o rodapé da conta.

Em 375×812, os painéis de **Arrecadação** e **IPTU** preservaram hierarquia, filtros empilhados e o estado de espera por carga fiscal sem corte horizontal. O menu móvel resume a navegação no cabeçalho, mantendo o conteúdo tributário utilizável em telas estreitas.
