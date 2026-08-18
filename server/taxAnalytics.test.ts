import { describe, expect, it } from "vitest";
import { buildTaxAnalytics, filterTaxRows } from "./db";

describe("métricas do BI Tributário", () => {
  it("calcula lançamento, arrecadação, inadimplência e dívida ativa a partir do livro fiscal", () => {
    const analytics = buildTaxAnalytics([
      { fiscalYear: 2026, referenceMonth: 1, taxType: "IPTU", assessedAmount: "1000.00", collectedAmount: "800.00", cancelledAmount: "0.00", exemptAmount: "0.00", outstandingAmount: "200.00", activeDebtOriginal: "150.00", activeDebtCorrection: "10.00", activeDebtInterest: "5.00", activeDebtPenalty: "2.00", activeDebtStatus: "inscrita", taxpayerName: "Contribuinte A", taxpayerDocument: "001", propertyReference: "imovel-01", companyReference: null, neighborhood: "Centro", propertyTransactionValue: null, dueDate: "2026-01-10" },
      { fiscalYear: 2026, referenceMonth: 2, taxType: "ISS", assessedAmount: "500.00", collectedAmount: "500.00", cancelledAmount: "0.00", exemptAmount: "0.00", outstandingAmount: "0.00", activeDebtOriginal: "0.00", activeDebtCorrection: "0.00", activeDebtInterest: "0.00", activeDebtPenalty: "0.00", activeDebtStatus: "nao_inscrita", taxpayerName: "Empresa B", taxpayerDocument: "002", propertyReference: null, companyReference: "empresa-02", neighborhood: "Centro", propertyTransactionValue: null, dueDate: null },
    ] as never[]);
    expect(analytics.totals.assessed).toBe(1500);
    expect(analytics.totals.collected).toBe(1300);
    expect(analytics.totals.outstanding).toBe(200);
    expect(analytics.totals.activeDebt).toBe(167);
    expect(analytics.totals.realizationRate).toBeCloseTo(86.67, 1);
    expect(analytics.totals.delinquencyRate).toBeCloseTo(13.33, 1);
    expect(analytics.byTax).toHaveLength(2);
  });

  it("aplica os filtros de ano, mês, tributo, bairro e situação ao recorte solicitado", () => {
    const rows = [
      { fiscalYear: 2026, referenceMonth: 1, taxType: "IPTU", neighborhood: "Centro", taxpayerType: "PF", status: "em_aberto" },
      { fiscalYear: 2026, referenceMonth: 2, taxType: "ISS", neighborhood: "Batel", taxpayerType: "PJ", status: "pago" },
      { fiscalYear: 2025, referenceMonth: 1, taxType: "IPTU", neighborhood: "Centro", taxpayerType: "PF", status: "divida_ativa" },
    ] as never[];
    expect(filterTaxRows(rows, { tenantId: "mun-1", fiscalYear: 2026, referenceMonth: 1, taxType: "IPTU", neighborhood: "Centro", status: "em_aberto" })).toEqual([rows[0]]);
    expect(filterTaxRows(rows, { tenantId: "mun-1", fiscalYear: 2025, status: "divida_ativa" })).toEqual([rows[2]]);
    expect(filterTaxRows(rows, { tenantId: "mun-1", neighborhood: "Batel", taxType: "ISS" })).toEqual([rows[1]]);
  });
});
