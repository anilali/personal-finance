import type { GrantWithVesting, GrantSummary, Lot } from "./types";

// ── Vest Event Generation ───────────────────────────────────────

export interface GeneratedVestEvent {
  vestDate: string;
  shares: number;
}

function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const targetMon = ((targetMonth % 12) + 12) % 12;
  // Clamp day to last day of target month
  const daysInMonth = new Date(targetYear, targetMon + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);
  const m = String(targetMon + 1).padStart(2, "0");
  const d = String(clampedDay).padStart(2, "0");
  return `${targetYear}-${m}-${d}`;
}

const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

export interface GenerateScheduleOptions {
  vestingStart: string;
  totalShares: number;
  totalMonths: number;
  cliffMonths: number;
  frequency: "monthly" | "quarterly" | "annually";
  remainderStrategy: "last" | "first";
}

export function generateSchedule(opts: GenerateScheduleOptions): GeneratedVestEvent[] {
  const { vestingStart, totalShares, totalMonths, cliffMonths, frequency, remainderStrategy } = opts;
  const frequencyMonths = FREQUENCY_MONTHS[frequency];
  const events: GeneratedVestEvent[] = [];

  // Cliff vest
  const cliffDate = addMonths(vestingStart, cliffMonths);
  const cliffShares = Math.floor(totalShares * (cliffMonths / totalMonths));
  if (cliffShares > 0) {
    events.push({ vestDate: cliffDate, shares: cliffShares });
  }

  // Post-cliff vests
  const remainingShares = totalShares - cliffShares;
  const remainingMonths = totalMonths - cliffMonths;
  const periodsAfterCliff = Math.floor(remainingMonths / frequencyMonths);

  if (periodsAfterCliff <= 0) {
    if (events.length === 0) {
      events.push({ vestDate: cliffDate, shares: totalShares });
    }
    return events;
  }

  const sharesPerPeriod = Math.floor(remainingShares / periodsAfterCliff);
  const remainder = remainingShares - sharesPerPeriod * periodsAfterCliff;

  for (let i = 1; i <= periodsAfterCliff; i++) {
    const date = addMonths(vestingStart, cliffMonths + i * frequencyMonths);
    let shares = sharesPerPeriod;
    if (remainder > 0) {
      if (remainderStrategy === "last" && i === periodsAfterCliff) shares += remainder;
      if (remainderStrategy === "first" && i === 1) shares += remainder;
    }
    events.push({ vestDate: date, shares });
  }

  return events;
}

export interface GenerateDateRangeOptions {
  firstVestDate: string;
  lastVestDate: string;
  sharesPerVest: number;
  frequency: "monthly" | "quarterly" | "annually";
}

export function generateDateRangeSchedule(opts: GenerateDateRangeOptions): GeneratedVestEvent[] {
  const { firstVestDate, lastVestDate, sharesPerVest, frequency } = opts;
  const frequencyMonths = FREQUENCY_MONTHS[frequency];
  const events: GeneratedVestEvent[] = [];

  for (let i = 0; ; i++) {
    const date = addMonths(firstVestDate, i * frequencyMonths);
    if (date > lastVestDate) break;
    events.push({ vestDate: date, shares: sharesPerVest });
  }

  return events;
}

// ── Grant Summary Computation ───────────────────────────────────

export function computeGrantSummary(grant: GrantWithVesting): GrantSummary {
  const vestedShares = grant.vestEvents
    .filter((v) => v.status === "vested")
    .reduce((sum, v) => sum + v.shares, 0);

  const forfeitedShares = grant.vestEvents
    .filter((v) => v.status === "forfeited")
    .reduce((sum, v) => sum + v.shares, 0);

  const isRsu = grant.grantType === "rsu";
  const exercisedShares = grant.exercises.reduce((sum, e) => sum + e.shares, 0);

  const totalCostBasis = grant.exercises.reduce(
    (sum, e) => sum + e.shares * e.exercisePrice, 0,
  );

  const totalSpreadAtExercise = grant.exercises.reduce(
    (sum, e) => sum + e.shares * Math.max(0, e.fmvAtExercise - e.exercisePrice), 0,
  );

  const currentPrice = grant.company.currentPrice ?? 0;
  const spread = Math.max(0, currentPrice - (grant.strikePrice ?? 0));
  const isExpired = grant.expirationDate
    ? new Date(grant.expirationDate) < new Date()
    : false;

  const soldShares = grant.sales.reduce((sum, s) => sum + s.shares, 0);
  // RSU: held = vested - sold (no exercise step). Options: held = exercised - sold.
  const heldShares = isRsu
    ? Math.max(0, vestedShares - soldShares)
    : Math.max(0, exercisedShares - soldShares);

  const totalProceeds = grant.sales.reduce(
    (sum, s) => sum + s.shares * s.salePrice, 0,
  );
  const totalSaleCostBasis = grant.sales.reduce(
    (sum, s) => sum + s.shares * s.costBasisPerShare, 0,
  );
  const totalGainLoss = totalProceeds - totalSaleCostBasis;

  const exercisableShares = isRsu ? 0 : (isExpired ? 0 : Math.max(0, vestedShares - exercisedShares));
  const remainingOptions = isRsu
    ? grant.totalShares - vestedShares - forfeitedShares  // RSU: unvested units remaining
    : grant.totalShares - exercisedShares - forfeitedShares;

  return {
    totalShares: grant.totalShares,
    vestedShares,
    forfeitedShares,
    unvestedShares: grant.totalShares - vestedShares - forfeitedShares,
    exercisedShares,
    exercisableShares,
    soldShares,
    heldShares,
    remainingOptions,
    currentSpread: spread,
    exercisableValue: exercisableShares * spread,
    totalCostBasis,
    totalSpreadAtExercise,
    totalProceeds,
    totalGainLoss,
    totalValue: remainingOptions * spread,
    isExpired,
    isFullyVested: vestedShares >= grant.totalShares - forfeitedShares,
  };
}

// ── Lot Computation ─────────────────────────────────────────────

export function computeLots(grant: GrantWithVesting): Lot[] {
  if (grant.grantType === "rsu") {
    // RSU: each vested event is a lot, cost basis = FMV at vest
    return grant.vestEvents
      .filter((v) => v.status === "vested")
      .map((v) => {
        const sharesSold = grant.sales
          .filter((s) => s.vestEventId === v.id)
          .reduce((sum, s) => sum + s.shares, 0);

        return {
          id: v.id,
          source: "vest" as const,
          vestEventId: v.id,
          referenceId: null,
          acquiredDate: v.vestDate,
          costBasis: v.fmvAtVest ?? 0,
          sharesAcquired: v.shares,
          sharesSold,
          sharesRemaining: Math.max(0, v.shares - sharesSold),
          grantType: grant.grantType,
          grantDate: grant.grantDate,
        };
      });
  }

  // Options: each exercise is a lot
  return grant.exercises.map((ex) => {
    const sharesSold = grant.sales
      .filter((s) => s.exerciseId === ex.id)
      .reduce((sum, s) => sum + s.shares, 0);

    // NSO: cost basis = FMV at exercise (spread already taxed as income)
    // ISO: cost basis = strike price (no income at exercise for regular tax)
    const costBasis = grant.grantType === "nso"
      ? ex.fmvAtExercise
      : ex.exercisePrice;

    return {
      id: ex.id,
      source: "exercise" as const,
      exerciseId: ex.id,
      referenceId: ex.referenceId,
      acquiredDate: ex.exerciseDate,
      costBasis,
      sharesAcquired: ex.shares,
      sharesSold,
      sharesRemaining: Math.max(0, ex.shares - sharesSold),
      grantType: grant.grantType,
      grantDate: grant.grantDate,
    };
  });
}

export function isIsoQualifyingDisposition(
  grantDate: string,
  exerciseDate: string,
  saleDate: string,
): boolean {
  const grant = new Date(grantDate + "T12:00:00");
  const exercise = new Date(exerciseDate + "T12:00:00");
  const sale = new Date(saleDate + "T12:00:00");

  const twoYearsFromGrant = new Date(grant);
  twoYearsFromGrant.setFullYear(twoYearsFromGrant.getFullYear() + 2);

  const oneYearFromExercise = new Date(exercise);
  oneYearFromExercise.setFullYear(oneYearFromExercise.getFullYear() + 1);

  return sale >= twoYearsFromGrant && sale >= oneYearFromExercise;
}

export function isLongTermHolding(exerciseDate: string, saleDate: string): boolean {
  const ex = new Date(exerciseDate + "T12:00:00");
  const sale = new Date(saleDate + "T12:00:00");
  const oneYear = new Date(ex);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  return sale >= oneYear;
}

// ── Formatting helpers ──────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShares(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}
