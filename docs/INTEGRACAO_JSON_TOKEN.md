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

## Recurso tributário: `tributos.lancamentos`

Para alimentar a Fase 1 do BI Tributário, envie o mesmo envelope para `POST /api/v1/ingest`, alterando apenas o recurso e os registros. O serviço identifica a prefeitura exclusivamente pelo `integrationToken` e rejeita tokens inválidos antes de persistir qualquer lançamento.

| Campo do registro | Obrigatório | Tipo | Observação |
|---|---:|---|---|
| `externalId` | Sim | texto | Identificador estável do lançamento no sistema de origem. |
| `fiscalYear` | Sim | número | Ano fiscal, por exemplo `2026`. |
| `referenceMonth` | Sim | número | Mês de referência, entre `1` e `12`. |
| `taxType` | Sim | texto | `IPTU`, `ISS`, `ITBI`, `TAXA`, `CONTRIBUICAO`, `MULTA` ou `OUTROS`. |
| `assessedAmount` | Não | número | Valor lançado. |
| `collectedAmount` | Não | número | Valor efetivamente arrecadado. |
| `outstandingAmount` | Não | número | Saldo ainda em aberto. |
| `status` | Não | texto | `lancado`, `pago`, `cancelado`, `isento`, `em_aberto` ou `divida_ativa`. |
| `neighborhood` | Não | texto | Bairro usado pelos filtros e análises territoriais. |
| `taxpayerName` e `taxpayerDocument` | Não | texto | Dados do contribuinte, visíveis somente a perfis com autorização municipal. |
| `activeDebtOriginal`, `activeDebtCorrection`, `activeDebtInterest`, `activeDebtPenalty` | Não | número | Componentes da dívida ativa. |

```json
{
  "integrationToken": "pm_token_gerado_no_painel",
  "source": "exportador-tributario",
  "resource": "tributos.lancamentos",
  "operation": "incremental",
  "idempotencyKey": "tributos-2026-01-lote-001",
  "sentAt": "2026-08-18T15:00:00.000Z",
  "records": [
    {
      "externalId": "iptu-2026-0001",
      "fiscalYear": 2026,
      "referenceMonth": 1,
      "taxType": "IPTU",
      "status": "em_aberto",
      "assessedAmount": 1250.00,
      "collectedAmount": 800.00,
      "outstandingAmount": 450.00,
      "neighborhood": "Centro",
      "taxpayerType": "PF"
    }
  ],
  "metadata": { "schemaVersion": "1.0" }
}
```
