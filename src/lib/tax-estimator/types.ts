// ── Filing & Document enums ──────────────────────────────────────

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh" | "qss";

export type EstimateType = "year-end" | "quarterly";

export type DocumentType =
  | "w2"
  | "paystub"
  | "1099-div"
  | "1099-int"
  | "1099-misc"
  | "1099-b"
  | "1099-oid"
  | "1099-nec"
  | "1099-r"
  | "1098"
  | "5498"
  | "8949"
  | "brokerage-trades"
  | "schedule-k1";

// ── Document data interfaces ─────────────────────────────────────

export interface W2Data {
  wages: number;
  federalWithheld: number;
  socialSecurityWages: number;
  socialSecurityWithheld: number;
  medicareWages: number;
  medicareWithheld: number;
  stateWages: number;
  stateWithheld: number;
  stateCode: string;
}

export interface PaystubData {
  payPeriodsCompleted: number;
  totalPayPeriods: number;
  ytdWages: number;
  ytdFederalWithheld: number;
  ytdSocialSecurityWages: number;
  ytdSocialSecurityWithheld: number;
  ytdMedicareWages: number;
  ytdMedicareWithheld: number;
  ytdStateWages: number;
  ytdStateWithheld: number;
  stateCode: string;
}

export interface Div1099Data {
  ordinaryDividends: number;
  qualifiedDividends: number;
  capitalGainDistributions: number;
  federalWithheld: number;
  stateWithheld: number;
}

export interface Int1099Data {
  interestIncome: number;
  federalWithheld: number;
  taxExemptInterest: number;
  stateWithheld: number;
}

export interface Misc1099Data {
  rents: number;
  royalties: number;
  otherIncome: number;
  federalWithheld: number;
}

export interface B1099Data {
  proceeds: number;
  costBasis: number;
  isLongTerm: boolean;
  federalWithheld: number;
}

export interface Oid1099Data {
  originalIssueDiscount: number;
  otherPeriodicInterest: number;
  federalWithheld: number;
}

export interface Nec1099Data {
  nonemployeeCompensation: number;
  federalWithheld: number;
}

export interface R1099Data {
  grossDistribution: number;
  taxableAmount: number;
  federalWithheld: number;
  stateWithheld: number;
}

export interface Mortgage1098Data {
  mortgageInterest: number;
  mortgageInsurancePremiums: number;
  pointsPaid: number;
}

export interface Ira5498Data {
  iraContributions: number;
  rothContributions: number;
  sepContributions: number;
}

export type Form8949EntryMode = "summary" | "detailed";

export interface Form8949Transaction {
  description: string;
  proceeds: number;
  costBasis: number;
  isLongTerm: boolean;
}

export interface Form8949Data {
  entryMode: Form8949EntryMode;
  // Summary mode
  shortTermProceeds: number;
  shortTermCostBasis: number;
  longTermProceeds: number;
  longTermCostBasis: number;
  // Detailed mode
  transactions: Form8949Transaction[];
}

export interface BrokerageTrade {
  ticker: string;
  shares: number;
  buyDate: string;   // YYYY-MM-DD
  sellDate: string;  // YYYY-MM-DD
  buyPrice: number;  // per share
  sellPrice: number; // per share
}

export interface BrokerageTradesData {
  trades: BrokerageTrade[];
}

export interface ScheduleK1Data {
  ordinaryBusinessIncome: number;
  netRentalIncome: number;
  interestIncome: number;
  dividends: number;
  shortTermCapitalGain: number;
  longTermCapitalGain: number;
  netSection1231Gain: number;
  subjectToSelfEmploymentTax: boolean;
}

export type DocumentDataMap = {
  w2: W2Data;
  paystub: PaystubData;
  "1099-div": Div1099Data;
  "1099-int": Int1099Data;
  "1099-misc": Misc1099Data;
  "1099-b": B1099Data;
  "1099-oid": Oid1099Data;
  "1099-nec": Nec1099Data;
  "1099-r": R1099Data;
  "1098": Mortgage1098Data;
  "5498": Ira5498Data;
  "8949": Form8949Data;
  "brokerage-trades": BrokerageTradesData;
  "schedule-k1": ScheduleK1Data;
};

// ── Quarterly payment tracking ────────────────────────────────────

export interface PaymentEntry {
  date: string;  // YYYY-MM-DD
  amount: number;
}

export interface QuarterlyPaymentsMade {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export type PaymentEntries = PaymentEntry[];

// ── Itemized deductions ──────────────────────────────────────────

export interface ItemizedDeductions {
  mortgageInterest: number;
  stateLocalTaxes: number;
  charitableContributions: number;
  medicalExpenses: number;
  otherDeductions: number;
}

// ── Income breakdown (aggregated from documents) ─────────────────

export interface IncomeBreakdown {
  wages: number;
  ordinaryDividends: number;
  qualifiedDividends: number;
  interestIncome: number;
  taxExemptInterest: number;
  shortTermCapitalGains: number;
  longTermCapitalGains: number;
  businessIncome: number;
  rentalIncome: number;
  retirementIncome: number;
  otherIncome: number;
  totalIncome: number;
}

// ── Tax calculation result ───────────────────────────────────────

export interface FederalTaxBreakdown {
  agi: number;
  deduction: number;
  deductionType: "standard" | "itemized";
  capitalLossDeduction: number;
  taxableOrdinaryIncome: number;
  ordinaryTax: number;
  capitalGainsTax: number;
  selfEmploymentTax: number;
  niit: number;
  totalTax: number;
}

export interface StateTaxBreakdown {
  stateName: string;
  stateCode: string;
  hasIncomeTax: boolean;
  isSupported: boolean;
  taxableIncome: number;
  stateTax: number;
}

export interface WithholdingSummary {
  federalWithholdings: number;
  stateWithholdings: number;
  totalWithholdings: number;
}

export interface QuarterlyPayment {
  quarter: string;
  quarterNumber: number;
  dueDate: string;
  amount: number;
  paid: number;
  remaining: number;
  isPast: boolean;
}

export interface TaxCalculationResult {
  federal: FederalTaxBreakdown;
  state: StateTaxBreakdown;
  income: IncomeBreakdown;
  withholdings: WithholdingSummary;
  totalTaxLiability: number;
  totalPaymentsMade: number;
  netOwed: number;
  effectiveRate: number;
  quarterlyPayments: QuarterlyPayment[];
  nextPaymentDue: QuarterlyPayment | null;
  penalty: PenaltyBreakdown;
}

export interface PenaltyQuarter {
  quarter: string;
  required: number;
  paid: number;
  shortfall: number;
  daysLate: number;
  penalty: number;
}

export interface PenaltyBreakdown {
  federalPenalty: number;
  statePenalty: number;
  totalPenalty: number;
  safeHarborMet: boolean;
  safeHarborMethod: string | null;
  federalQuarters: PenaltyQuarter[];
  stateQuarters: PenaltyQuarter[];
}

// ── Estimate with documents (from DB) ────────────────────────────

export interface EstimateDocument {
  id: string;
  estimateId: string;
  documentType: DocumentType;
  label: string | null;
  data: Record<string, any>;
  createdAt: Date;
}

export interface Estimate {
  id: string;
  name: string;
  taxYear: number;
  estimateType: EstimateType;
  filingStatus: FilingStatus;
  state: string;
  currentQuarter: number;
  priorYearTax: number;
  priorYearStateTax: number;
  capitalLossCarryforward: number;
  paymentEntries: PaymentEntries;
  quarterlyPaymentsMade: QuarterlyPaymentsMade;
  selectedDocumentTypes: DocumentType[];
  useItemizedDeductions: boolean;
  itemizedDeductions: ItemizedDeductions | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstimateWithDocuments extends Estimate {
  documents: EstimateDocument[];
}
