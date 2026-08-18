# Painel Municipal — Documentação Completa

**Versão documentada:** Fase 2 do BI Tributário  
**Aplicação publicada:** [painelmuni-dxbhgcpp.manus.space](https://painelmuni-dxbhgcpp.manus.space)  
**Última atualização:** 18 de agosto de 2026  
**Escopo:** operação funcional, arquitetura técnica, segurança, menus, painéis, integrações e manutenção.

> O **Painel Municipal** é uma aplicação web de gestão e transparência municipal com acesso autenticado, isolamento rigoroso de dados por prefeitura e um módulo de BI Tributário abastecido por cargas JSON autenticadas por token exclusivo.

## 1. Visão geral do produto

O aplicativo foi concebido para reunir informações administrativas, indicadores, projetos, transparência e serviços municipais em uma experiência única. O mesmo ambiente também permite que a prefeitura mantenha seus registros, gerencie as pessoas autorizadas e acompanhe dados tributários consolidados.

O sistema não possui área anônima: **todo acesso exige login**. Depois da autenticação, cada pessoa enxerga somente a prefeitura à qual está vinculada. A exceção é o **superusuário global**, que pode alternar entre as prefeituras cadastradas. Esse desenho atende ao uso multi-prefeitura sem misturar dados, consultas, recebimentos ou permissões.

| Objetivo | Como o aplicativo atende |
|---|---|
| Transparência organizada | Exibe contratos, licitações, receitas e despesas cadastradas como públicas. |
| Gestão operacional | Permite cadastrar e acompanhar projetos, indicadores, medições e serviços. |
| Isolamento municipal | Todas as entidades de negócio recebem `tenantId`, correspondente à prefeitura ativa. |
| Controle de acesso | Login obrigatório, vínculo por e-mail e perfis municipalizados. |
| BI Tributário | Consolida lançamentos, arrecadação, inadimplência, dívida ativa, parcelamentos, fiscalização e contribuintes. |
| Integração segura | Recebe cargas JSON no endpoint protegido por token exclusivo de cada prefeitura. |

## 2. Como o aplicativo foi criado

O Painel Municipal foi implementado como uma aplicação web full-stack. A camada de interface foi construída com React e Tailwind CSS; o servidor utiliza Express e tRPC; a persistência é feita com Drizzle ORM em banco MySQL/TiDB. A arquitetura favorece contratos tipados entre frontend e backend, reduzindo divergências entre os dados exibidos e os dados persistidos.

O desenvolvimento ocorreu por módulos: primeiro foram entregues gestão municipal, transparência, indicadores, serviços, autenticação, contextos municipais e recebimentos; depois foi implantada a **Fase 1 do BI Tributário**; por fim, a **Fase 2** acrescentou parcelamentos, fiscalização e contribuintes. O esquema do banco foi evoluído com migrações versionadas, e cada etapa recebeu validação de tipos, testes automatizados e compilação de produção.

| Camada | Tecnologias e responsabilidade |
|---|---|
| Interface | React 19, TypeScript, Tailwind CSS 4, componentes baseados em Radix UI e gráficos Recharts. |
| Roteamento | Wouter, com rotas de consulta autenticada e rotas administrativas. |
| Comunicação | tRPC 11 e React Query, com tipagem de ponta a ponta. |
| Servidor | Express 4, responsável por OAuth, tRPC e endpoint de ingestão JSON. |
| Persistência | Drizzle ORM sobre MySQL/TiDB; migrações em `drizzle/`. |
| Autenticação | OAuth Manus, com sessão em cookie seguro e contexto de usuário no servidor. |
| Qualidade | Vitest, TypeScript (`pnpm check`) e build de produção (`pnpm build`). |

### 2.1 Fluxo de construção de um módulo

Cada módulo funcional segue um caminho consistente: a entidade é modelada no schema, uma migração atualiza o banco, helpers de consulta e persistência são criados no servidor, procedures tRPC definem os contratos de acesso e as páginas React exibem os dados com estados de carregamento, erro e vazio. A implementação é coberta por testes antes da validação visual e da publicação.

```mermaid
flowchart LR
  A[Requisito municipal] --> B[Schema e migração]
  B --> C[Helpers em server/db.ts]
  C --> D[Procedure tRPC protegida]
  D --> E[Página React e filtros]
  E --> F[Testes e validação visual]
  F --> G[Build e publicação]
```

## 3. Arquitetura funcional e técnica

O frontend mantém a prefeitura selecionada no contexto `MunicipalityContext`. O identificador dessa prefeitura é transmitido como `tenantId` nas consultas. No backend, o servidor valida o usuário e seu vínculo municipal antes de permitir a leitura ou alteração dos registros. Nos recebimentos externos, o `tenantId` não é aceito do exportador: a prefeitura é descoberta exclusivamente pelo token de integração.

```mermaid
flowchart TB
  U[Usuário autenticado] --> FE[React + páginas e layouts]
  FE --> CTX[Contexto da prefeitura ativa]
  CTX --> RPC[tRPC /api/trpc]
  RPC --> AUTH[Validação de sessão e vínculo]
  AUTH --> DBH[Helpers de negócio]
  DBH --> DB[(MySQL/TiDB)]
  EXP[Exportador tributário] --> ING[POST /api/v1/ingest]
  ING --> TOK[Validação do token municipal]
  TOK --> REC[Recibo idempotente]
  REC --> DB
```

### 3.1 Estrutura de diretórios relevante

| Caminho | Conteúdo principal |
|---|---|
| `client/src/App.tsx` | Rotas globais e bloqueio de sessão. |
| `client/src/components/` | Layouts, estados de consulta, elementos reutilizáveis e componentes de interface. |
| `client/src/contexts/MunicipalityContext.tsx` | Prefeitura ativa, persistência local da seleção e lista de contextos autorizados. |
| `client/src/pages/` | Telas de consulta, administração, configuração municipal e BI Tributário. |
| `server/routers/municipal.ts` | Regras de autorização e procedures tRPC municipais. |
| `server/db.ts` | Consultas, persistência, agregações e filtros analíticos. |
| `server/integrationReceiver.ts` | Endpoint JSON de ingestão protegido por token. |
| `drizzle/schema.ts` | Modelo de dados e índices da aplicação. |
| `drizzle/*.sql` | Histórico das migrações de banco. |
| `docs/` | Contratos de integração, verificações e esta documentação. |

### 3.2 Modelo de dados

As tabelas de negócio usam `tenantId` como chave de segregação lógica. O relacionamento central é entre **usuário**, **prefeitura** e **vínculo municipal**. A tabela de usuários autorizados permite pré-cadastrar um e-mail antes de seu primeiro login.

| Grupo | Entidades principais | Finalidade |
|---|---|---|
| Identidade | `users`, `municipalities`, `municipality_memberships`, `municipal_authorized_users` | Login, superusuário, vínculo municipal, perfis e autorização antecipada por e-mail. |
| Gestão | `municipal_projects`, `municipal_indicators`, `indicator_measurements` | Projetos, metas, evolução e qualidade das medições. |
| Transparência | `transparency_records`, `municipal_services` | Registros públicos e catálogo de serviços. |
| BI Tributário — Fase 1 | `tax_ledger_entries` | Lançamentos, arrecadação, IPTU, ISS, ITBI, inadimplência e dívida ativa. |
| BI Tributário — Fase 2 | `tax_installment_plans`, `tax_inspections`, `tax_payers` | Parcelamentos, fiscalizações e perfis de contribuintes. |
| Integração | `ingestion_receipts`, `ingestion_batches` | Auditoria, idempotência e rastreabilidade das cargas. |

## 4. Login, segurança e isolamento por prefeitura

O aplicativo exige autenticação para todas as rotas. Quando não há sessão, é apresentada a tela **“Painel Municipal seguro”** com o botão de entrada. Após o retorno do OAuth, o sistema identifica o usuário e carrega somente as prefeituras permitidas para ele.

### 4.1 Papéis de acesso

| Papel | Escopo | Permissões práticas |
|---|---|---|
| `viewer` | Uma prefeitura vinculada | Consulta dados e painéis permitidos; não altera cadastros. |
| `editor` | Uma prefeitura vinculada | Consulta e gerencia dados operacionais, como projetos, indicadores, transparência e serviços. |
| `admin` municipal | Uma prefeitura vinculada | Inclui as permissões de editor e administra membros, usuários autorizados, token e recebimentos. |
| `admin` global / superusuário | Todas as prefeituras | Pode criar prefeituras e possui visão transversal; ainda opera uma prefeitura ativa por vez. |

> A autorização é conferida no servidor antes de cada procedure. Ocultar um menu na interface não substitui a verificação de segurança do backend.

### 4.2 Regras de segregação

1. A prefeitura selecionada é mantida no contexto do navegador e validada contra a lista autorizada após o login.
2. Um usuário comum sem vínculo não vê dados municipais e recebe uma orientação para solicitar sua autorização.
3. Consultas e alterações exigem que o usuário possua o papel municipal adequado para o `tenantId` solicitado.
4. O superusuário pode consultar qualquer prefeitura cadastrada, enquanto usuários comuns ficam restritos ao próprio vínculo.
5. Cargas externas não escolhem a prefeitura por um ID livre: o destino é resolvido pelo token exclusivo.

### 4.3 Cadastro prévio por e-mail

O administrador pode registrar o e-mail de uma pessoa antes do primeiro acesso. A autorização recebe o status **Aguardando login**. Quando a pessoa entra pela primeira vez com o mesmo e-mail, o sistema ativa automaticamente o vínculo para a prefeitura e o perfil definidos.

## 5. Navegação e menus

Há duas experiências principais, ambas autenticadas: a **consulta municipal**, voltada à leitura de informações publicadas, e a **gestão municipal**, voltada à operação administrativa.

### 5.1 Menu superior de consulta municipal

| Menu | Rota | Finalidade |
|---|---|---|
| Visão geral | `/` | Resume população, receitas, despesas, projetos e indicadores publicados. |
| Indicadores | `/indicadores` | Apresenta indicadores por área, fonte, referência, qualidade e evolução. |
| Transparência | `/transparencia` | Permite pesquisar contratos, licitações, despesas e receitas. |
| Serviços | `/servicos` | Exibe o catálogo de serviços municipais e canais de acesso. |
| Seletor de prefeitura | — | Altera o contexto ativo dentre as prefeituras autorizadas. |
| Gestão municipal | `/admin` | Abre o painel administrativo. |
| Sair | — | Encerra a sessão autenticada. |

Em dispositivos móveis, o cabeçalho mantém as ações essenciais de consulta, seleção da prefeitura, acesso à gestão e saída.

### 5.2 Sidebar de gestão municipal

No desktop, a gestão utiliza uma barra lateral recolhível. Em telas menores, ela é aberta pelo botão de menu no topo e mostra o título da seção atual. A área de tributos possui rolagem própria, de modo que todos os painéis podem ser alcançados mesmo em telas de baixa altura.

| Grupo | Menu | Rota | Função |
|---|---|---|---|
| Gestão | Visão geral | `/admin` | Resumo operacional da prefeitura ativa. |
| Gestão | Metas e projetos | `/admin/projetos` | Cadastro e acompanhamento de iniciativas municipais. |
| Gestão | Indicadores | `/admin/indicadores` | Gestão de indicadores e medições. |
| Gestão | Transparência | `/admin/transparencia` | Publicação e edição de registros de transparência. |
| Gestão | Serviços | `/admin/servicos` | Cadastro e edição do catálogo de serviços. |
| Gestão | Recebimentos | `/admin/recebimentos` | Consulta de cargas recebidas e histórico idempotente. |
| Tributos | Tributos — geral | `/admin/tributos` | Visão consolidada do BI Tributário. |
| Tributos | Arrecadação | `/admin/tributos/arrecadacao` | Valores lançados, arrecadados e em aberto. |
| Tributos | IPTU | `/admin/tributos/iptu` | Análises do imposto predial e territorial. |
| Tributos | ISS | `/admin/tributos/iss` | Análises do imposto sobre serviços. |
| Tributos | ITBI | `/admin/tributos/itbi` | Análises de transmissão de bens imóveis. |
| Tributos | Inadimplência | `/admin/tributos/inadimplencia` | Estoque e recortes de valores em aberto. |
| Tributos | Dívida ativa | `/admin/tributos/divida-ativa` | Componentes e situação da dívida inscrita. |
| Tributos | Parcelamentos | `/admin/tributos/parcelamentos` | Acordos, recuperação e parcelas vencidas. |
| Tributos | Fiscalização | `/admin/tributos/fiscalizacao` | Procedimentos fiscais, autos e conversão. |
| Tributos | Contribuintes | `/admin/tributos/contribuintes` | Base cadastral, perfis e concentração financeira. |

O menu de perfil no rodapé da sidebar oferece acesso à configuração de **Prefeituras**, retorno à consulta autenticada e saída da sessão.

## 6. Painéis de consulta autenticada

### 6.1 Visão geral

É a página inicial após o login. Ela mostra o contexto da prefeitura ativa, população cadastrada, projetos ativos, data de atualização, cards de receitas e despesas, gráfico de evolução financeira e atalhos para transparência e serviços. Os indicadores publicados mais recentes aparecem no mesmo painel.

### 6.2 Indicadores

Cada indicador apresenta área responsável, descrição, unidade de medida, último valor, fonte, data de referência e qualidade. Quando existem duas ou mais medições, o painel exibe o gráfico de evolução. Os estados possíveis de qualidade são **validado**, **pendente** e **não informado**.

### 6.3 Transparência

O painel de transparência oferece filtros por tipo de registro, categoria e período. Os tipos suportados são **contrato**, **licitação**, **despesa** e **receita**. Os resultados trazem título, categoria, data, situação, referência e valor.

### 6.4 Serviços municipais

O catálogo organiza os serviços por categoria e apresenta descrição, instruções de acesso, link digital e telefone quando cadastrados. Somente serviços ativos e publicados são exibidos na área de consulta.

## 7. Painéis administrativos de gestão

### 7.1 Visão geral administrativa

Oferece uma leitura operacional com população, receitas, despesas e projetos ativos. Também contabiliza indicadores, registros de transparência e serviços cadastrados, ajudando a verificar a cobertura das informações municipais.

### 7.2 Metas e projetos

Permite criar e editar projetos com título, área, descrição, status, progresso, datas de início e prazo, orçamento e visibilidade pública. Os únicos status aceitos são os seguintes:

| Status | Uso esperado |
|---|---|
| `planejado` | Projeto ainda não iniciado. |
| `em andamento` | Projeto em execução. |
| `concluído` | Projeto finalizado. |
| `cancelado` | Projeto interrompido ou descontinuado. |

### 7.3 Indicadores e medições

O administrador cria indicadores com nome, área, unidade e descrição. Para manter a série histórica, deve registrar medições com valor, data de referência, fonte, observações e qualidade. O painel mostra as últimas medições em tabela e o gráfico passa a aparecer quando existem pelo menos dois pontos.

### 7.4 Transparência administrativa

Permite publicar e editar registros de contratos, licitações, despesas e receitas. O formulário aceita tipo, data, título, categoria, valor, número de referência, situação, fornecedor ou favorecido, descrição e flag de publicação.

### 7.5 Serviços administrativos

Permite incluir ou editar o nome do serviço, categoria, descrição, instruções de acesso, URL digital e telefone. A opção de visibilidade determina se o serviço pode ser mostrado na área de consulta municipal.

### 7.6 Recebimentos

O módulo registra cargas manuais ou integradas com origem, recurso, operação, chave de idempotência e lista de registros. Também permite consultar o histórico de recibos por prefeitura, incluindo a situação de processamento. Os estados de recebimento são **aceito**, **processando**, **concluído**, **erro** e **duplicado**.

### 7.7 Prefeituras, usuários e integração

A página `/admin/prefeituras` é o ponto central de administração do ambiente multi-prefeitura. Nela é possível criar uma prefeitura, selecionar o contexto ativo, gerar ou renovar o token municipal e administrar e-mails autorizados.

| Ação | Resultado |
|---|---|
| Criar prefeitura | Registra nome, UF e população; seleciona automaticamente o novo contexto; gera token exclusivo. |
| Selecionar prefeitura | Define o contexto que será usado pelas telas administrativas e de consulta. |
| Gerar novo token | Revoga o token anterior e revela um novo valor apenas uma vez. |
| Autorizar usuário | Pré-cadastra um e-mail com perfil de consulta, gestão ou administração. |
| Remover usuário autorizado | Cancela a autorização antecipada daquele e-mail. |

> O token completo deve ser copiado no momento da criação ou renovação. Depois disso, o sistema mantém apenas o hash e uma dica final mascarada para conferência.

## 8. BI Tributário

O BI Tributário é um conjunto de painéis administrativos que analisa a informação recebida dos sistemas de origem. Os dados são sempre filtrados pela prefeitura ativa e cada painel apresenta estado vazio caso ainda não exista carga da fonte tributária. O sistema não cria dados fictícios para preencher gráficos ou tabelas.

### 8.1 Fase 1

| Painel | Informações principais |
|---|---|
| Dashboard Geral | Síntese de lançamento, arrecadação, aberto e composição tributária. |
| Arrecadação | Comparativos por tributo e período. |
| IPTU | Indicadores e análise segmentada do IPTU. |
| ISS | Indicadores e análise segmentada do ISS. |
| ITBI | Indicadores e análise segmentada do ITBI. |
| Inadimplência | Valores em aberto, filtros e recortes de devedores. |
| Dívida Ativa | Valores inscritos, componentes e situação da dívida ativa. |

Os filtros da Fase 1 incluem, conforme o painel, ano fiscal, mês, tributo, bairro, tipo de contribuinte e situação do lançamento.

### 8.2 Fase 2

| Painel | Indicadores e filtros |
|---|---|
| Parcelamentos | Acordos ativos, valor recuperado, parcelas vencidas, saldo parcelado, situação e ano. |
| Fiscalização | Fiscalizações concluídas, autos, créditos constituídos, conversão, produtividade por fiscal, situação e ano. |
| Contribuintes | Base ativa, pessoas jurídicas, imóveis vinculados, cadastros suspensos, concentração de arrecadação, saldos, ano, perfil e situação. |

Nos três painéis, os dados são agregados somente após o filtro de prefeitura. Os filtros de ano, situação e tipo de contribuinte também são aplicados nas consultas e validados por testes automatizados.

### 8.3 Itens previstos para evolução

Os painéis abaixo fazem parte do mapa funcional do produto, mas não estão implementados nesta versão:

| Painel futuro | Objetivo |
|---|---|
| Taxas e Outros Tributos | Consolidar receitas de taxas, contribuições, multas e demais naturezas. |
| Cadastro Imobiliário | Analisar imóveis, referências cadastrais e informações territoriais. |
| Cadastro Econômico | Analisar empresas, CNAEs e atividade econômica. |
| Inteligência Tributária | Gerar priorização, alertas de risco e oportunidades de recuperação. |

## 9. Integração JSON por token municipal

### 9.1 Endpoint e autenticação

O endpoint de recebimento é `POST /api/v1/ingest`. A prefeitura de destino é resolvida pelo campo `integrationToken` do envelope ou pelo token Bearer enviado no cabeçalho `Authorization`. O token precisa possuir ao menos 20 caracteres e ser válido para uma prefeitura cadastrada.

```http
POST /api/v1/ingest
Content-Type: application/json
Authorization: Bearer pm_token_gerado_no_painel
```

```json
{
  "integrationToken": "pm_token_gerado_no_painel",
  "source": "script",
  "resource": "tributos.lancamentos",
  "operation": "incremental",
  "idempotencyKey": "tributos-2026-01-lote-001",
  "sentAt": "2026-08-18T15:00:00.000Z",
  "records": []
}
```

O campo `tenantId` **não deve ser enviado pelo exportador**. Caso exista, ele não é usado para definir o destino. Essa regra impede que um sistema de origem envie dados para outra prefeitura apenas alterando um identificador.

### 9.2 Envelope e regras operacionais

| Campo | Obrigatório | Regra |
|---|---:|---|
| `integrationToken` | Sim, salvo uso de Bearer | Token exclusivo da prefeitura. |
| `source` | Sim | `betha` ou `script`. |
| `resource` | Sim | Recurso municipal ou tributário enviado. |
| `operation` | Sim | `snapshot` ou `incremental`. |
| `idempotencyKey` | Sim | Identificador único da carga para a prefeitura. |
| `sentAt` | Sim | Data e hora ISO 8601 com timezone. |
| `records` | Sim | De 1 a 10.000 registros por requisição. |
| `metadata` | Não | Cursor e versão do schema, quando necessários. |

A mesma `idempotencyKey` usada novamente para a mesma prefeitura é tratada como carga duplicada e não repete a persistência. A chave é independente por prefeitura, pois existe índice único composto por `tenantId` e `idempotencyKey`.

### 9.3 Recursos tributários suportados

| Recurso | Fase | Destino funcional |
|---|---|---|
| `tributos.lancamentos` | 1 | Livro tributário, arrecadação, IPTU, ISS, ITBI, inadimplência e dívida ativa. |
| `tributos.parcelamentos` | 2 | Acordos, parcelas e recuperação de débitos. |
| `tributos.fiscalizacoes` | 2 | Fiscalizações, autos, notificações e créditos. |
| `tributos.contribuintes` | 2 | Base de pessoas físicas e jurídicas e atributos cadastrais. |

O contrato detalhado, incluindo campos permitidos e exemplos completos, está disponível em **[Integração JSON por Token][1]**.

### 9.4 Respostas esperadas

| HTTP | Situação | Interpretação operacional |
|---:|---|---|
| `200` | Carga duplicada | A mesma chave já havia sido processada; não reenviar com outra chave sem necessidade. |
| `202` | Carga aceita | O recibo foi registrado e o recurso suportado foi persistido. |
| `400` | Payload inválido | Corrigir campos obrigatórios, tipos, enumerações ou limites do envelope. |
| `401` | Token inválido | Conferir o token ativo da prefeitura e, se necessário, gerar novo token. |
| `500` | Indisponibilidade | Repetir posteriormente usando a **mesma** `idempotencyKey`. |

## 10. Operação recomendada

### 10.1 Implantação inicial de uma prefeitura

1. Um superusuário acessa **Gestão municipal → Prefeituras**.
2. Cadastra nome, UF e população da prefeitura.
3. Copia e armazena o token mostrado na confirmação; o valor deve ser entregue exclusivamente ao responsável pelo exportador.
4. Seleciona a prefeitura recém-criada como contexto ativo.
5. Pré-autoriza os e-mails das pessoas que atuarão naquela prefeitura, definindo o perfil apropriado.
6. Cadastra informações iniciais ou configura o exportador para enviar as cargas tributárias.
7. Confere os recibos e os painéis após o primeiro recebimento.

### 10.2 Rotina administrativa

| Frequência | Atividade recomendada |
|---|---|
| Contínua | Atualizar projetos, indicadores, medições, transparência e serviços conforme a publicação oficial. |
| A cada inclusão de equipe | Autorizar o e-mail com o perfil mínimo necessário. |
| A cada alteração de fornecedor/exportador | Renovar o token e atualizar a configuração do exportador de forma coordenada. |
| Após cada carga tributária | Conferir recibo, quantidade processada e painéis do período. |
| Periódica | Revisar visibilidade pública, vínculos municipais e dados desatualizados. |

### 10.3 Boas práticas de dados

Os valores públicos devem ser publicados somente depois de conferidos pela prefeitura responsável. Nas cargas tributárias, `externalId` deve permanecer estável para que o registro possa ser atualizado com segurança. As chaves de idempotência devem identificar de forma única cada lote; um formato como `recurso-ano-mes-lote` facilita auditoria e reprocessamento controlado.

## 11. Desenvolvimento, validação e publicação

### 11.1 Comandos usuais

```bash
pnpm dev      # ambiente de desenvolvimento
pnpm check    # verificação TypeScript
pnpm test     # suíte Vitest
pnpm build    # compilação frontend e backend de produção
```

### 11.2 Cobertura validada na versão documentada

A versão da Fase 2 foi validada com **43 testes automatizados**, incluindo autenticação, isolamento entre prefeituras, permissões, cadastro e ativação por e-mail, token de integração, idempotência, roteamento de recursos tributários, métricas, filtros e autorização dos três painéis adicionados. Também foram executados `pnpm check`, `pnpm build` e verificações visuais desktop e mobile.

| Categoria de teste | Verificações |
|---|---|
| Sessão e autorização | Bloqueio sem login, papéis, vínculo municipal e superusuário. |
| Integração | Token válido ou inválido, duplicidade e direcionamento para a prefeitura correta. |
| BI Fase 1 | Agregações e filtros de lançamentos tributários. |
| BI Fase 2 | Métricas de parcelamentos, fiscalização e contribuintes; filtros reais e isolamento. |
| Interface | Criação e seleção de prefeitura, exposição única do token e ativação por e-mail. |

### 11.3 Publicação

O projeto utiliza publicação automática por checkpoint. Cada checkpoint aprovado cria uma versão restaurável e publica a revisão correspondente no domínio configurado. A versão que contém a Fase 2 do BI Tributário é o checkpoint `3d6603c4`.

## 12. Limites e decisões de produto

Esta versão não expõe dados sem autenticação e não cria dados fictícios para os painéis. Painéis tributários somente mostram gráficos e tabelas quando uma carga válida tiver sido recebida para a prefeitura ativa. Os módulos futuros de Taxas, Cadastro Imobiliário, Cadastro Econômico e Inteligência Tributária permanecem previstos, mas não devem ser apresentados como entregues até sua implementação.

Além disso, a integração com sistemas externos como Betha depende de contrato técnico, permissões comerciais e especificação de origem fornecida pelo fornecedor ou pela prefeitura. A aplicação já oferece o endpoint, o contrato JSON e o mecanismo de token, mas o conector específico requer mapeamento oficial da fonte. Consulte também **[Integração Betha][2]**.

## 13. Referências internas

[1]: ./INTEGRACAO_JSON_TOKEN.md "Contrato de integração JSON por token municipal"
[2]: ./INTEGRACAO_BETHA.md "Orientações para integração Betha"
[3]: ./VERIFICACAO_VISUAL.md "Registro de verificação visual do projeto"

