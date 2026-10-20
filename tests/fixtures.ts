import type { CompanyFacts, Fact } from "@/lib/normalize";

const f = (end: string, val: number, opts: Partial<Fact> = {}): Fact => ({ end, val, form: "10-K", filed: "2025-11-01", ...opts });

/** Two fiscal years ending late September (Apple-like), with a tag switch for revenue and quarterly data in FY2025. */
export const facts: CompanyFacts = {
  cik: 1,
  entityName: "Testco Inc.",
  facts: {
    "us-gaap": {
      SalesRevenueNet: { units: { USD: [f("2023-09-30", 80, { start: "2022-10-01", filed: "2023-11-01" })] } },
      RevenueFromContractWithCustomerExcludingAssessedTax: {
        units: {
          USD: [
            f("2024-09-28", 100, { start: "2023-10-01", filed: "2024-11-01" }),
            f("2024-09-28", 101, { start: "2023-10-01", filed: "2025-11-01" }), // restated in later 10-K: latest filed wins
            f("2025-09-27", 120, { start: "2024-09-29" }),
            f("2025-09-27", 33, { start: "2025-06-29" }), // 3-month figure inside a 10-K: must be ignored for annual
            f("2024-12-28", 25, { start: "2024-09-29", form: "10-Q" }),
            f("2025-03-29", 30, { start: "2024-12-29", form: "10-Q" }),
            f("2025-06-28", 32, { start: "2025-03-30", form: "10-Q" }),
            f("2025-06-28", 87, { start: "2024-09-29", form: "10-Q" }), // 9-month YTD: ignored
            f("2025-12-27", 40, { start: "2025-09-28", form: "10-Q" }), // FY2026 Q1, before the FY2026 10-K exists
          ],
        },
      },
      NetIncomeLoss: {
        units: {
          USD: [
            f("2023-09-30", 16, { start: "2022-10-01" }),
            f("2024-09-28", 20, { start: "2023-10-01" }),
            f("2025-09-27", 30, { start: "2024-09-29" }),
            f("2024-12-28", 6, { start: "2024-09-29", form: "10-Q" }),
            f("2025-03-29", 7, { start: "2024-12-29", form: "10-Q" }),
            f("2025-06-28", 8, { start: "2025-03-30", form: "10-Q" }),
          ],
        },
      },
      OperatingIncomeLoss: { units: { USD: [f("2025-09-27", 36, { start: "2024-09-29" })] } },
      CostOfGoodsAndServicesSold: { units: { USD: [f("2025-09-27", 66, { start: "2024-09-29" })] } },
      Assets: { units: { USD: [f("2024-09-28", 200), f("2025-09-27", 300)] } },
      AssetsCurrent: { units: { USD: [f("2025-09-27", 90)] } },
      LiabilitiesCurrent: { units: { USD: [f("2025-09-27", 100)] } },
      InventoryNet: { units: { USD: [f("2025-09-27", 10)] } },
      LiabilitiesAndStockholdersEquity: { units: { USD: [f("2025-09-27", 300)] } },
      StockholdersEquity: { units: { USD: [f("2024-09-28", 50), f("2025-09-27", 70)] } },
      LongTermDebtNoncurrent: { units: { USD: [f("2025-09-27", 40)] } },
      LongTermDebtCurrent: { units: { USD: [f("2025-09-27", 5)] } },
      CommercialPaper: { units: { USD: [f("2025-09-27", 3)] } },
    },
  },
};
