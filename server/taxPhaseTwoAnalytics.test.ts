import { describe, expect, it } from "vitest";
import { buildInspectionAnalytics, buildInstallmentAnalytics, buildTaxPayerAnalytics, filterInspectionRows, filterInstallmentRows, filterTaxPayerRows, filterTaxpayerFinanceRows } from "./db";

describe("métricas tributárias da Fase 2", () => {
  it("consolida recuperação, saldo e inadimplência de parcelamentos", () => {
    const analytics = buildInstallmentAnalytics([
      { status: "ativo", installmentsTotal: 10, installmentsPaid: 6, installmentsOverdue: 2, originalAmount: "1000", negotiatedAmount: "900", recoveredAmount: "540", outstandingAmount: "360", taxpayerName: "Contribuinte A", taxpayerDocument: "1" },
      { status: "inadimplente", installmentsTotal: 4, installmentsPaid: 1, installmentsOverdue: 3, originalAmount: "500", negotiatedAmount: "500", recoveredAmount: "100", outstandingAmount: "400", taxpayerName: "Contribuinte B", taxpayerDocument: "2" },
    ] as never[]);
    expect(analytics.totals).toMatchObject({ plans: 2, active: 1, delinquent: 1, recovered: 640, outstanding: 760, overdueInstallments: 5 });
    expect(analytics.totals.delinquencyRate).toBeCloseTo(5 / 14 * 100);
    expect(analytics.topBalances[0]?.taxpayerName).toBe("Contribuinte B");
  });

  it("consolida produtividade e conversão de fiscalização", () => {
    const analytics = buildInspectionAnalytics([
      { status: "concluida", notifications: 2, infractionNotices: 1, assessedAmount: "2000", collectedAmount: "800", fineAmount: "300", companyReference: "empresa-1", fiscalName: "Fiscal A" },
      { status: "aberta", notifications: 1, infractionNotices: 0, assessedAmount: "1000", collectedAmount: "0", fineAmount: "0", companyReference: "empresa-2", fiscalName: "Fiscal A" },
    ] as never[]);
    expect(analytics.totals).toMatchObject({ inspections: 2, completed: 1, open: 1, notifications: 3, infractionNotices: 1, assessed: 3000, collected: 800, auditedCompanies: 2 });
    expect(analytics.totals.conversionRate).toBeCloseTo(800 / 3000 * 100);
    expect(analytics.byAuditor[0]?.inspections).toBe(2);
  });

  it("relaciona perfis de contribuintes às posições financeiras do livro e parcelamentos", () => {
    const analytics = buildTaxPayerAnalytics(
      [{ status: "ativo", type: "PJ", propertiesCount: 2, companiesCount: 1 }, { status: "suspenso", type: "PF", propertiesCount: 1, companiesCount: 0 }] as never[],
      [{ taxpayerName: "Empresa A", taxpayerDocument: "10", assessedAmount: "1000", collectedAmount: "700", outstandingAmount: "300", activeDebtOriginal: "50", activeDebtCorrection: "10", activeDebtInterest: "5", activeDebtPenalty: "5" }] as never[],
      [{ taxpayerName: "Empresa A", taxpayerDocument: "10", outstandingAmount: "200" }] as never[],
    );
    expect(analytics.profiles).toMatchObject({ total: 2, active: 1, companies: 1, properties: 3, suspended: 1 });
    expect(analytics.topContributors[0]).toMatchObject({ taxpayerName: "Empresa A", collected: 700, outstanding: 300 });
    expect(analytics.topDebtors[0]).toMatchObject({ activeDebt: 70, installmentOutstanding: 200 });
  });

  it("aplica o recorte real de ano e situação antes de agregar parcelamentos e fiscalizações", () => {
    const installments = filterInstallmentRows([{ fiscalYear: 2026, status: "ativo" }, { fiscalYear: 2025, status: "ativo" }, { fiscalYear: 2026, status: "inadimplente" }] as never[], { tenantId: "mun-1", fiscalYear: 2026, status: "ativo" });
    const inspections = filterInspectionRows([{ fiscalYear: 2026, status: "concluida" }, { fiscalYear: 2026, status: "aberta" }, { fiscalYear: 2025, status: "concluida" }] as never[], { tenantId: "mun-1", fiscalYear: 2026, status: "concluida" });
    expect(installments).toHaveLength(1);
    expect(installments[0]).toMatchObject({ fiscalYear: 2026, status: "ativo" });
    expect(inspections).toHaveLength(1);
    expect(inspections[0]).toMatchObject({ fiscalYear: 2026, status: "concluida" });
  });

  it("restringe perfis e posições financeiras ao tipo e à situação selecionados", () => {
    const profiles = filterTaxPayerRows([{ name: "Empresa A", document: "1", type: "PJ", status: "ativo" }, { name: "Pessoa B", document: "2", type: "PF", status: "ativo" }, { name: "Empresa C", document: "3", type: "PJ", status: "suspenso" }] as never[], { tenantId: "mun-1", taxpayerType: "PJ", status: "ativo" });
    const finance = filterTaxpayerFinanceRows([{ taxpayerName: "Empresa A", taxpayerDocument: "1" }, { taxpayerName: "Pessoa B", taxpayerDocument: "2" }, { taxpayerName: "Empresa C", taxpayerDocument: "3" }] as never[], profiles, { tenantId: "mun-1", taxpayerType: "PJ", status: "ativo" });
    expect(profiles).toHaveLength(1);
    expect(finance).toEqual([{ taxpayerName: "Empresa A", taxpayerDocument: "1" }]);
  });
});
