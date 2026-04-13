import type {
  FilingStatus,
  PaymentEntry,
  QuarterlyPaymentsMade,
  PenaltyBreakdown,
  PenaltyQuarter,
} from "./types";

// ── IRS underpayment interest rates (annual) ─────────────────────
// Updated quarterly by IRS — these are recent rates
const FEDERAL_UNDERPAYMENT_RATE: Record<string, number> = {
  "2024": 0.08,
  "2025": 0.07,
  "2026": 0.07,
};

// CA FTB underpayment rate
const CA_UNDERPAYMENT_RATE = 0.07;

// ── Quarter due dates and periods ────────────────────────────────

function getQuarterDueDates(taxYear: number) {
  return [
    { quarter: "Q1", due: new Date(taxYear, 3, 15), periodStart: new Date(taxYear, 0, 1), periodEnd: new Date(taxYear, 2, 31) },
    { quarter: "Q2", due: new Date(taxYear, 5, 15), periodStart: new Date(taxYear, 3, 1), periodEnd: new Date(taxYear, 4, 31) },
    { quarter: "Q3", due: new Date(taxYear, 8, 15), periodStart: new Date(taxYear, 5, 1), periodEnd: new Date(taxYear, 7, 31) },
    { quarter: "Q4", due: new Date(taxYear + 1, 0, 15), periodStart: new Date(taxYear, 8, 1), periodEnd: new Date(taxYear, 11, 31) },
  ];
}

// ── Payment attribution to quarters ──────────────────────────────

function attributePaymentsToQuarters(
  payments: PaymentEntry[],
  taxYear: number,
): QuarterlyPaymentsMade {
  const totals: QuarterlyPaymentsMade = { q1: 0, q2: 0, q3: 0, q4: 0 };
  const dueDates = getQuarterDueDates(taxYear);

  for (const payment of payments) {
    if (!payment.date || !payment.amount) continue;
    const payDate = new Date(payment.date + "T12:00:00");

    // Attribute to the quarter whose due date the payment was made before or on
    if (payDate <= dueDates[0].due) totals.q1 += payment.amount;
    else if (payDate <= dueDates[1].due) totals.q2 += payment.amount;
    else if (payDate <= dueDates[2].due) totals.q3 += payment.amount;
    else totals.q4 += payment.amount;
  }

  return totals;
}

// ── Federal penalty calculation ──────────────────────────────────

function calculateFederalPenalty(
  currentYearTax: number,
  priorYearTax: number,
  filingStatus: FilingStatus,
  agi: number,
  withholdings: number,
  paymentEntries: PaymentEntry[],
  taxYear: number,
): { penalty: number; quarters: PenaltyQuarter[]; safeHarborMet: boolean; safeHarborMethod: string | null } {
  const taxAfterWithholdings = currentYearTax - withholdings;

  // No penalty if owed less than $1,000
  if (taxAfterWithholdings < 1000) {
    return { penalty: 0, quarters: [], safeHarborMet: true, safeHarborMethod: "owed_under_1000" };
  }

  // Safe harbor thresholds
  const currentYear90 = currentYearTax * 0.9;
  const priorYearThreshold = agi > 150000 ? priorYearTax * 1.1 : priorYearTax;
  const requiredAnnual = Math.min(currentYear90, priorYearThreshold);
  const requiredPerQuarter = requiredAnnual / 4;

  // Total paid (withholdings + estimated payments)
  const paymentsByQuarter = attributePaymentsToQuarters(paymentEntries, taxYear);
  const totalEstimatedPayments = paymentsByQuarter.q1 + paymentsByQuarter.q2 + paymentsByQuarter.q3 + paymentsByQuarter.q4;
  const totalPaid = withholdings + totalEstimatedPayments;

  // Check safe harbor: paid >= 90% of current year or >= 100%/110% of prior year
  if (totalPaid >= currentYear90) {
    return { penalty: 0, quarters: [], safeHarborMet: true, safeHarborMethod: "90_current_year" };
  }
  if (priorYearTax > 0 && totalPaid >= priorYearThreshold) {
    return { penalty: 0, quarters: [], safeHarborMet: true, safeHarborMethod: agi > 150000 ? "110_prior_year" : "100_prior_year" };
  }

  // Per-quarter withholding credit (spread evenly)
  const quarterlyWithholding = withholdings / 4;
  const annualRate = FEDERAL_UNDERPAYMENT_RATE[String(taxYear)] ?? 0.07;
  const dueDates = getQuarterDueDates(taxYear);
  const filingDeadline = new Date(taxYear + 1, 3, 15); // April 15 of next year

  const quarters: PenaltyQuarter[] = [];
  let totalPenalty = 0;
  let cumulativePaid = 0;
  let cumulativeRequired = 0;

  const qKeys: (keyof QuarterlyPaymentsMade)[] = ["q1", "q2", "q3", "q4"];

  for (let i = 0; i < 4; i++) {
    const paid = quarterlyWithholding + paymentsByQuarter[qKeys[i]];
    cumulativePaid += paid;
    cumulativeRequired += requiredPerQuarter;

    const shortfall = Math.max(0, cumulativeRequired - cumulativePaid);
    const dueDate = dueDates[i].due;
    const daysLate = shortfall > 0
      ? Math.max(0, Math.floor((filingDeadline.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Simple interest: shortfall * annual rate * (days / 365)
    const quarterPenalty = shortfall > 0
      ? shortfall * annualRate * (daysLate / 365)
      : 0;

    totalPenalty += quarterPenalty;

    quarters.push({
      quarter: `Q${i + 1}`,
      required: requiredPerQuarter,
      paid,
      shortfall,
      daysLate,
      penalty: Math.round(quarterPenalty),
    });
  }

  return {
    penalty: Math.round(totalPenalty),
    quarters,
    safeHarborMet: false,
    safeHarborMethod: null,
  };
}

// ── CA state penalty (special rules for >$1M AGI) ───────────────

function calculateCAPenalty(
  currentYearStateTax: number,
  priorYearStateTax: number,
  agi: number,
  withholdings: number,
  paymentEntries: PaymentEntry[],
  taxYear: number,
): { penalty: number; quarters: PenaltyQuarter[] } {
  const taxAfterWithholdings = currentYearStateTax - withholdings;

  if (taxAfterWithholdings < 500) {
    return { penalty: 0, quarters: [] };
  }

  // CA rule: AGI > $1M cannot use prior year safe harbor — must pay 90% of current year
  const isHighIncome = agi > 1000000;
  const requiredAnnual = isHighIncome
    ? currentYearStateTax * 0.9
    : Math.min(currentYearStateTax * 0.9, priorYearStateTax)
  const requiredPerQuarter = requiredAnnual / 4;

  const paymentsByQuarter = attributePaymentsToQuarters(paymentEntries, taxYear);
  const quarterlyWithholding = withholdings / 4;
  const dueDates = getQuarterDueDates(taxYear);
  const filingDeadline = new Date(taxYear + 1, 3, 15);

  const quarters: PenaltyQuarter[] = [];
  let totalPenalty = 0;
  let cumulativePaid = 0;
  let cumulativeRequired = 0;

  const qKeys: (keyof QuarterlyPaymentsMade)[] = ["q1", "q2", "q3", "q4"];

  for (let i = 0; i < 4; i++) {
    const paid = quarterlyWithholding + paymentsByQuarter[qKeys[i]];
    cumulativePaid += paid;
    cumulativeRequired += requiredPerQuarter;

    const shortfall = Math.max(0, cumulativeRequired - cumulativePaid);
    const dueDate = dueDates[i].due;
    const daysLate = shortfall > 0
      ? Math.max(0, Math.floor((filingDeadline.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const quarterPenalty = shortfall > 0
      ? shortfall * CA_UNDERPAYMENT_RATE * (daysLate / 365)
      : 0;

    totalPenalty += quarterPenalty;

    quarters.push({
      quarter: `Q${i + 1}`,
      required: requiredPerQuarter,
      paid,
      shortfall,
      daysLate,
      penalty: Math.round(quarterPenalty),
    });
  }

  return { penalty: Math.round(totalPenalty), quarters };
}

// ── Main penalty calculation ─────────────────────────────────────

export function calculatePenalty(
  federalTax: number,
  stateTax: number,
  priorYearTax: number,
  priorYearStateTax: number,
  filingStatus: FilingStatus,
  agi: number,
  federalWithholdings: number,
  stateWithholdings: number,
  paymentEntries: PaymentEntry[],
  taxYear: number,
  stateCode: string,
): PenaltyBreakdown {
  const federal = calculateFederalPenalty(
    federalTax,
    priorYearTax,
    filingStatus,
    agi,
    federalWithholdings,
    paymentEntries,
    taxYear,
  );

  // State penalty — currently only CA has special rules
  let statePenalty = 0;
  let stateQuarters: PenaltyQuarter[] = [];

  if (stateCode === "CA" && stateTax > 0) {
    const ca = calculateCAPenalty(
      stateTax,
      priorYearStateTax,
      agi,
      stateWithholdings,
      paymentEntries,
      taxYear,
    );
    statePenalty = ca.penalty;
    stateQuarters = ca.quarters;
  }

  return {
    federalPenalty: federal.penalty,
    statePenalty,
    totalPenalty: federal.penalty + statePenalty,
    safeHarborMet: federal.safeHarborMet,
    safeHarborMethod: federal.safeHarborMethod,
    federalQuarters: federal.quarters,
    stateQuarters,
  };
}
