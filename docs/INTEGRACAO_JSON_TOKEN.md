# Integração JSON por token municipal

Cada prefeitura possui um **token de integração exclusivo**. O valor é apresentado somente após o cadastro ou a renovação do token no painel administrativo. Armazene-o no exportador de forma segura e não o publique em arquivos, telas ou repositórios.

## Endpoint

Envie as cargas para `POST /api/v1/ingest`.

## Envelope esperado

```json
{
  "integrationToken": "pm_token_gerado_no_painel",
  "source": "script",
  "resource": "indicadores",
  "operation": "incremental",
  "idempotencyKey": "indicadores-2026-08-17-lote-001",
  "sentAt": "2026-08-17T21:00:00.000Z",
  "records": [
    { "codigo": "POPULACAO", "valor": 123456 }
  ],
  "metadata": {
    "schemaVersion": "1.0"
  }
}
```

O serviço localiza a prefeitura pelo campo `integrationToken`; portanto, **não envie nem confie em um `tenantId` informado pelo exportador**. A repetição da mesma `idempotencyKey` para a mesma prefeitura é tratada como duplicidade.

> Um novo token revoga imediatamente o anterior. Atualize o exportador antes de continuar os envios.
