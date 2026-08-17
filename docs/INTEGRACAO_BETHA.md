# Integração Betha — Estado da Base Técnica

Esta aplicação possui apenas uma **base de recepção genérica** para cargas autorizadas. Ela não declara, simula ou pressupõe uma integração oficial com a Betha. A implementação de qualquer adaptador específico depende do recebimento do contrato comercial, método de autenticação, Swagger oficial, requisitos de `user-access` e autorização técnica do fornecedor.

Enquanto essas dependências não forem disponibilizadas, os registros de entrada devem ser tratados como objetos JSON abertos, validados somente pelo envelope próprio do Painel Municipal e associados obrigatoriamente a uma prefeitura identificada por `tenantId`.

| Elemento | Situação atual | Próxima condição necessária |
|---|---|---|
| Envelope de recepção | Schema validado na aplicação | Exposição do endpoint versionado com segredo por ambiente |
| Idempotência | Estrutura de recibos e índice único previstos no banco | Processador seguro de cargas e retenção configurada |
| Adaptador Betha | Não implementado | Swagger e autorização oficial recebidos |
| Credenciais do fornecedor | Não solicitadas nem armazenadas | Configuração segura após validação comercial |
