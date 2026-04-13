import type {
  FilingStatus,
  IncomeBreakdown,
  ItemizedDeductions,
  PaymentEntries,
  QuarterlyPaymentsMade,
  EstimateDocument,
  FederalTaxBreakdown,
  StateTaxBreakdown,
  WithholdingSummary,
  QuarterlyPayment,
  TaxCalculationResult,
  W2Data,
  Div1099Data,
  Int1099Data,
  Misc1099Data,
  B1099Data,
  Oid1099Data,
  Nec1099Data,
  R1099Data,
  PaystubData,
  Form8949Data,
  BrokerageTradesData,
  BrokerageTrade,
  ScheduleK1Data,
} from "./types";
import {
  FEDERAL_BRACKETS,
  STANDARD_DEDUCTIONS,
  LTCG_BRACKETS,
  SELF_EMPLOYMENT,
  FICA,
  NIIT,
  STATE_TAX_DATA,
  NO_INCOME_TAX_STATES,
  type TaxBracket,
} from "./tax-data";
import { calculatePenalty } from "./penalty";

// ── Helpers ──────────────────────────────────────────────────────

function applyBrackets(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

function n(val: unknown): number {
  return typeof val === "number" && !isNaN(val) ? val : 0;
}

// ── Income aggregation ───────────────────────────────────────────

export function aggregateIncome(documents: EstimateDocument[]): IncomeBreakdown {
  const result: IncomeBreakdown = {
    wages: 0,
    ordinaryDividends: 0,
    qualifiedDividends: 0,
    interestIncome: 0,
    taxExemptInterest: 0,
    shortTermCapitalGains: 0,
    longTermCapitalGains: 0,
    businessIncome: 0,
    rentalIncome: 0,
    retirementIncome: 0,
    otherIncome: 0,
    totalIncome: 0,
  };

  for (const doc of documents) {
    const d = doc.data;
    switch (doc.documentType) {
      case "w2": {
        const data = d as unknown as W2Data;
        result.wages += n(data.wages);
        break;
      }
      case "paystub": {
        const data = d as unknown as PaystubData;
        const factor = n(data.payPeriodsCompleted) > 0
          ? n(data.totalPayPeriods) / n(data.payPeriodsCompleted)
          : 1;
        result.wages += n(data.ytdWages) * factor;
        break;
      }
      case "1099-div": {
        const data = d as unknown as Div1099Data;
        result.ordinaryDividends += n(data.ordinaryDividends);
        result.qualifiedDividends += n(data.qualifiedDividends);
        result.longTermCapitalGains += n(data.capitalGainDistributions);
        break;
      }
      case "1099-int": {
        const data = d as unknown as Int1099Data;
        result.interestIncome += n(data.interestIncome);
        result.taxExemptInterest += n(data.taxExemptInterest);
        break;
      }
      case "1099-misc": {
        const data = d as unknown as Misc1099Data;
        result.rentalIncome += n(data.rents);
        result.otherIncome += n(data.royalties) + n(data.otherIncome);
        break;
      }
      case "1099-b": {
        const data = d as unknown as B1099Data;
        const gain = n(data.proceeds) - n(data.costBasis);
        if (data.isLongTerm) {
          result.longTermCapitalGains += gain;
        } else {
          result.shortTermCapitalGains += gain;
        }
        break;
      }
      case "1099-oid": {
        const data = d as unknown as Oid1099Data;
        result.interestIncome += n(data.originalIssueDiscount) + n(data.otherPeriodicInterest);
        break;
      }
      case "1099-nec": {
        const data = d as unknown as Nec1099Data;
        result.businessIncome += n(data.nonemployeeCompensation);
        break;
      }
      case "1099-r": {
        const data = d as unknown as R1099Data;
        result.retirementIncome += n(data.taxableAmount);
        break;
      }
      case "8949": {
        const data = d as unknown as Form8949Data;
        if (data.entryMode === "detailed" && Array.isArray(data.transactions)) {
          for (const tx of data.transactions) {
            const gain = n(tx.proceeds) - n(tx.costBasis);
            if (tx.isLongTerm) {
              result.longTermCapitalGains += gain;
            } else {
              result.shortTermCapitalGains += gain;
            }
          }
        } else {
          result.shortTermCapitalGains += n(data.shortTermProceeds) - n(data.shortTermCostBasis);
          result.longTermCapitalGains += n(data.longTermProceeds) - n(data.longTermCostBasis);
        }
        break;
      }
      case "brokerage-trades": {
        const data = d as unknown as BrokerageTradesData;
        if (Array.isArray(data.trades)) {
          for (const trade of data.trades) {
            const gain = (n(trade.sellPrice) - n(trade.buyPrice)) * n(trade.shares);
            const lt = trade.buyDate && trade.sellDate
              ? (new Date(trade.sellDate).getTime() - new Date(trade.buyDate).getTime()) / (1000 * 60 * 60 * 24) > 365
              : false;
            if (lt) {
              result.longTermCapitalGains += gain;
            } else {
              result.shortTermCapitalGains += gain;
            }
          }
        }
        break;
      }
      case "schedule-k1": {
        const data = d as unknown as ScheduleK1Data;
        result.businessIncome += n(data.ordinaryBusinessIncome);
        result.rentalIncome += n(data.netRentalIncome);
        result.interestIncome += n(data.interestIncome);
        result.ordinaryDividends += n(data.dividends);
        result.shortTermCapitalGains += n(data.shortTermCapitalGain);
        result.longTermCapitalGains += n(data.longTermCapitalGain) + n(data.netSection1231Gain);
        break;
      }
      // 1098, 5498 don't contribute to income
    }
  }

  // Ordinary dividends include qualified dividends — avoid double-counting.
  // For tax purposes, non-qualified dividends = ordinary - qualified.
  result.totalIncome =
    result.wages +
    result.ordinaryDividends +
    result.interestIncome +
    result.shortTermCapitalGains +
    result.longTermCapitalGains +
    result.businessIncome +
    result.rentalIncome +
    result.retirementIncome +
    result.otherIncome;

  return result;
}

// ── Self-employment tax ──────────────────────────────────────────

function calculateSelfEmploymentTax(
  documents: EstimateDocument[],
  taxYear: string,
  filingStatus: FilingStatus,
): { seTax: number; seDeduction: number; seIncome: number } {
  let seIncome = 0;

  for (const doc of documents) {
    const d = doc.data;
    if (doc.documentType === "1099-nec") {
      seIncome += n((d as unknown as Nec1099Data).nonemployeeCompensation);
    }
    if (doc.documentType === "schedule-k1") {
      const k1 = d as unknown as ScheduleK1Data;
      if (k1.subjectToSelfEmploymentTax) {
        seIncome += n(k1.ordinaryBusinessIncome);
      }
    }
  }

  if (seIncome <= 0) return { seTax: 0, seDeduction: 0, seIncome: 0 };

  const netEarnings = seIncome * SELF_EMPLOYMENT.netEarningsMultiplier;
  const yearData = FICA[taxYear as keyof typeof FICA] ?? FICA["2026"];

  // Social Security portion (capped at wage base)
  const ssTaxable = Math.min(netEarnings, yearData.socialSecurityWageBase);
  const ssTax = ssTaxable * SELF_EMPLOYMENT.socialSecurityPortion;

  // Medicare portion (no cap, but additional Medicare tax applies above threshold)
  const medicareTax = netEarnings * SELF_EMPLOYMENT.medicarePortion;
  const threshold = yearData.additionalMedicareThreshold[filingStatus];
  const additionalMedicare =
    netEarnings > threshold
      ? (netEarnings - threshold) * yearData.additionalMedicareRate
      : 0;

  const seTax = ssTax + medicareTax + additionalMedicare;
  const seDeduction = seTax * SELF_EMPLOYMENT.deductiblePortion;

  return { seTax, seDeduction, seIncome };
}

// ── Federal tax ──────────────────────────────────────────────────

export function calculateFederalTax(
  income: IncomeBreakdown,
  filingStatus: FilingStatus,
  taxYear: string,
  useItemized: boolean,
  itemizedDeductions: ItemizedDeductions | null,
  documents: EstimateDocument[],
  capitalLossCarryforward: number = 0,
): FederalTaxBreakdown {
  const year = taxYear in FEDERAL_BRACKETS ? taxYear : "2026";

  // 1. AGI
  const se = calculateSelfEmploymentTax(documents, year, filingStatus);
  const agi = income.totalIncome - se.seDeduction;

  // 2. Deduction
  const standardDeduction = STANDARD_DEDUCTIONS[year]?.[filingStatus] ?? 0;
  let itemizedTotal = 0;
  if (itemizedDeductions) {
    // SALT cap at $10,000
    const saltCapped = Math.min(itemizedDeductions.stateLocalTaxes, 10000);
    // Medical expenses: only amount above 7.5% of AGI
    const medicalFloor = agi * 0.075;
    const medicalDeductible = Math.max(0, itemizedDeductions.medicalExpenses - medicalFloor);
    itemizedTotal =
      itemizedDeductions.mortgageInterest +
      saltCapped +
      itemizedDeductions.charitableContributions +
      medicalDeductible +
      itemizedDeductions.otherDeductions;
  }

  const deductionType: "standard" | "itemized" =
    useItemized && itemizedTotal > standardDeduction ? "itemized" : "standard";
  const deduction = deductionType === "itemized" ? itemizedTotal : standardDeduction;

  // 3. Capital gain/loss netting and limitation
  // Apply prior year capital loss carryforward first
  const netShortTerm = income.shortTermCapitalGains - capitalLossCarryforward; // carryforward offsets ST first
  const netLongTerm = income.longTermCapitalGains;
  const netCapitalGainLoss = netShortTerm + netLongTerm;

  // If net capital loss, only $3,000 ($1,500 MFS) is deductible against ordinary income
  const capitalLossLimit = filingStatus === "mfs" ? 1500 : 3000;
  const capitalLossDeduction = netCapitalGainLoss < 0
    ? Math.min(Math.abs(netCapitalGainLoss), capitalLossLimit)
    : 0;

  // Preferential income: only positive qualified dividends + positive net LTCG
  const preferentialIncome = netCapitalGainLoss > 0
    ? Math.max(0, income.qualifiedDividends) + Math.max(0, netLongTerm)
    : Math.max(0, income.qualifiedDividends);

  // AGI adjustment: if net capital loss, reduce AGI by the deductible portion
  const adjustedAgi = netCapitalGainLoss < 0
    ? agi + netCapitalGainLoss + capitalLossDeduction
    : agi;

  // 3b. Taxable income split: ordinary vs preferential
  const taxableIncome = Math.max(0, adjustedAgi - deduction);
  const taxableOrdinaryIncome = Math.max(0, taxableIncome - preferentialIncome);

  // 4. Tax on ordinary income
  const brackets = FEDERAL_BRACKETS[year]?.[filingStatus];
  const ordinaryTax = brackets ? applyBrackets(taxableOrdinaryIncome, brackets) : 0;

  // 5. Tax on qualified dividends + LTCG at preferential rates
  const ltcgBrackets = LTCG_BRACKETS[year]?.[filingStatus];
  let capitalGainsTax = 0;
  if (ltcgBrackets && preferentialIncome > 0) {
    const totalForRate = taxableOrdinaryIncome + preferentialIncome;
    const taxOnFull = applyBrackets(totalForRate, ltcgBrackets);
    const taxOnOrdinary = applyBrackets(taxableOrdinaryIncome, ltcgBrackets);
    capitalGainsTax = taxOnFull - taxOnOrdinary;
  }

  // 6. Self-employment tax
  const selfEmploymentTax = se.seTax;

  // 7. Net Investment Income Tax (3.8%)
  // Applies to the lesser of: net investment income, or MAGI above threshold
  const niitThreshold = NIIT.thresholds[filingStatus];
  const netInvestmentIncome =
    Math.max(0, income.ordinaryDividends) +
    Math.max(0, income.interestIncome) +
    Math.max(0, netCapitalGainLoss) +
    Math.max(0, income.rentalIncome);
  const magiOverThreshold = Math.max(0, agi - niitThreshold);
  const niit = Math.min(netInvestmentIncome, magiOverThreshold) * NIIT.rate;

  const totalTax = ordinaryTax + capitalGainsTax + selfEmploymentTax + niit;

  return {
    agi,
    deduction,
    deductionType,
    capitalLossDeduction,
    taxableOrdinaryIncome,
    ordinaryTax,
    capitalGainsTax,
    selfEmploymentTax,
    niit,
    totalTax,
  };
}

// ── State tax ────────────────────────────────────────────────────

export function calculateStateTax(
  income: IncomeBreakdown,
  stateCode: string,
  filingStatus: FilingStatus,
): StateTaxBreakdown {
  // No income tax states
  if (NO_INCOME_TAX_STATES.has(stateCode)) {
    const stateData = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", FL: "Florida", NV: "Nevada", NH: "New Hampshire", SD: "South Dakota", TN: "Tennessee", TX: "Texas", WA: "Washington", WY: "Wyoming" } as Record<string, string>;
    return {
      stateName: stateData[stateCode] ?? stateCode,
      stateCode,
      hasIncomeTax: false,
      isSupported: true,
      taxableIncome: 0,
      stateTax: 0,
    };
  }

  const config = STATE_TAX_DATA[stateCode];
  if (!config) {
    return {
      stateName: stateCode,
      stateCode,
      hasIncomeTax: true,
      isSupported: false,
      taxableIncome: income.totalIncome,
      stateTax: 0,
    };
  }

  const stateDeduction = config.standardDeduction[filingStatus] ?? 0;
  const taxableIncome = Math.max(0, income.totalIncome - stateDeduction);
  const brackets = config.brackets[filingStatus];
  const stateTax = brackets ? applyBrackets(taxableIncome, brackets) : 0;

  return {
    stateName: config.name,
    stateCode,
    hasIncomeTax: true,
    isSupported: true,
    taxableIncome,
    stateTax,
  };
}

// ── Withholdings ─────────────────────────────────────────────────

export function calculateWithholdings(documents: EstimateDocument[]): WithholdingSummary {
  let federalWithholdings = 0;
  let stateWithholdings = 0;

  for (const doc of documents) {
    const d = doc.data as Record<string, any>;

    if (doc.documentType === "paystub") {
      // Annualize paystub withholdings
      const factor = n(d.payPeriodsCompleted) > 0
        ? n(d.totalPayPeriods) / n(d.payPeriodsCompleted)
        : 1;
      federalWithholdings += n(d.ytdFederalWithheld) * factor;
      stateWithholdings += n(d.ytdStateWithheld) * factor;
    } else {
      federalWithholdings += n(d.federalWithheld);
      stateWithholdings += n(d.stateWithheld);
    }
  }

  return {
    federalWithholdings,
    stateWithholdings,
    totalWithholdings: federalWithholdings + stateWithholdings,
  };
}

// ── Quarterly payments ───────────────────────────────────────────

export function calculateQuarterlyPayments(
  netOwed: number,
  taxYear: number,
  currentQuarter: number,
  paymentsMade: QuarterlyPaymentsMade,
): QuarterlyPayment[] {
  const quarterKeys: ("q1" | "q2" | "q3" | "q4")[] = ["q1", "q2", "q3", "q4"];
  const dueDates = [
    `April 15, ${taxYear}`,
    `June 15, ${taxYear}`,
    `September 15, ${taxYear}`,
    `January 15, ${taxYear + 1}`,
  ];

  const totalPaid = quarterKeys.reduce((s, k) => s + (paymentsMade[k] ?? 0), 0);
  const stillOwed = Math.max(0, netOwed - totalPaid);

  // How many quarters remain (including current)?
  const remainingCount = Math.max(1, 5 - currentQuarter);
  const perQuarter = remainingCount > 0 ? Math.ceil(stillOwed / remainingCount) : 0;

  return quarterKeys.map((key, idx) => {
    const qNum = idx + 1;
    const paid = paymentsMade[key] ?? 0;
    const isPast = qNum < currentQuarter;
    // Past quarters: amount is what should have been paid (netOwed/4)
    // Current + future: divide remaining evenly
    const amount = isPast ? paid : perQuarter;
    const remaining = isPast ? 0 : Math.max(0, perQuarter - paid);

    return {
      quarter: `Q${qNum}`,
      quarterNumber: qNum,
      dueDate: dueDates[idx],
      amount,
      paid,
      remaining,
      isPast,
    };
  });
}

// ── Full estimate orchestrator ───────────────────────────────────

export function computeFullEstimate(
  documents: EstimateDocument[],
  filingStatus: FilingStatus,
  taxYear: number,
  stateCode: string,
  useItemized: boolean,
  itemizedDeductions: ItemizedDeductions | null,
  currentQuarter: number = 1,
  paymentsMade: QuarterlyPaymentsMade = { q1: 0, q2: 0, q3: 0, q4: 0 },
  capitalLossCarryforward: number = 0,
  priorYearTax: number = 0,
  priorYearStateTax: number = 0,
  paymentEntries: PaymentEntries = [],
): TaxCalculationResult {
  const income = aggregateIncome(documents);
  const yearStr = String(taxYear);

  const federal = calculateFederalTax(
    income,
    filingStatus,
    yearStr,
    useItemized,
    itemizedDeductions,
    documents,
    capitalLossCarryforward,
  );

  const state = calculateStateTax(income, stateCode, filingStatus);
  const withholdings = calculateWithholdings(documents);

  const totalTaxLiability = federal.totalTax + state.stateTax;
  const totalPaymentsMade = paymentsMade.q1 + paymentsMade.q2 + paymentsMade.q3 + paymentsMade.q4;
  const netOwed = totalTaxLiability - withholdings.totalWithholdings - totalPaymentsMade;
  const effectiveRate = income.totalIncome > 0 ? totalTaxLiability / income.totalIncome : 0;
  const quarterlyPayments = calculateQuarterlyPayments(netOwed, taxYear, currentQuarter, paymentsMade);
  const nextPaymentDue = quarterlyPayments.find((qp) => !qp.isPast && qp.remaining > 0) ?? null;

  const penalty = calculatePenalty(
    federal.totalTax,
    state.stateTax,
    priorYearTax,
    priorYearStateTax,
    filingStatus,
    federal.agi,
    withholdings.federalWithholdings,
    withholdings.stateWithholdings,
    paymentEntries,
    taxYear,
    stateCode,
  );

  return {
    federal,
    state,
    income,
    withholdings,
    totalTaxLiability,
    totalPaymentsMade,
    netOwed,
    effectiveRate,
    quarterlyPayments,
    nextPaymentDue,
    penalty,
  };
}
