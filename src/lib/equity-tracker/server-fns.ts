import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
  equityCompanies,
  equityGrants,
  equityVestEvents,
  equityExercises,
  equitySales,
} from "@/db/schema";
import { eq, desc, lte, and, or } from "drizzle-orm";
import type {
  Company,
  Grant,
  VestEvent,
  Exercise,
  Sale,
  CompanyWithGrants,
  GrantWithVesting,
  GrantType,
  GrantStatus,
  VestStatus,
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateGrantInput,
  UpdateGrantInput,
  CreateSaleInput,
  CreateExerciseInput,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────

function toCompany(row: typeof equityCompanies.$inferSelect): Company {
  return {
    ...row,
    currentPrice: row.currentPrice ? Number(row.currentPrice) : null,
  };
}

function toGrant(row: typeof equityGrants.$inferSelect): Grant {
  return {
    ...row,
    grantType: row.grantType as GrantType,
    status: row.status as GrantStatus,
    totalShares: Number(row.totalShares),
    strikePrice: Number(row.strikePrice),
    grantPrice: row.grantPrice ? Number(row.grantPrice) : null,
    vestingSchedule: row.vestingSchedule as Grant["vestingSchedule"],
  };
}

function toVestEvent(row: typeof equityVestEvents.$inferSelect): VestEvent {
  return {
    ...row,
    shares: Number(row.shares),
    fmvAtVest: row.fmvAtVest ? Number(row.fmvAtVest) : null,
    status: row.status as VestStatus,
  };
}

function toExercise(row: typeof equityExercises.$inferSelect): Exercise {
  return {
    ...row,
    shares: Number(row.shares),
    exercisePrice: Number(row.exercisePrice),
    fmvAtExercise: Number(row.fmvAtExercise),
    unvestedShares: Number(row.unvestedShares),
  };
}

function toSale(row: typeof equitySales.$inferSelect): Sale {
  return {
    ...row,
    shares: Number(row.shares),
    salePrice: Number(row.salePrice),
    costBasisPerShare: Number(row.costBasisPerShare),
  };
}

// ── Companies ───────────────────────────────────────────────────

export const getCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<Company[]> => {
    const rows = await db
      .select()
      .from(equityCompanies)
      .orderBy(desc(equityCompanies.updatedAt));
    return rows.map(toCompany);
  },
);

export const getCompany = createServerFn({ method: "GET" })
  .inputValidator((input: { companyId: string }) => input)
  .handler(async ({ data }): Promise<CompanyWithGrants | null> => {
    const [row] = await db
      .select()
      .from(equityCompanies)
      .where(eq(equityCompanies.id, data.companyId));

    if (!row) return null;

    const grantRows = await db
      .select()
      .from(equityGrants)
      .where(eq(equityGrants.companyId, data.companyId))
      .orderBy(desc(equityGrants.grantDate));

    return {
      ...toCompany(row),
      grants: grantRows.map(toGrant),
    };
  });

export const createCompany = createServerFn({ method: "POST" })
  .inputValidator((input: CreateCompanyInput) => input)
  .handler(async ({ data }): Promise<Company> => {
    const [row] = await db
      .insert(equityCompanies)
      .values({
        name: data.name,
        ticker: data.ticker || null,
        currentPrice: data.currentPrice ? String(data.currentPrice) : null,
        priceAsOf: data.priceAsOf || null,
        isCurrent: data.isCurrent,
        separationDate: data.separationDate || null,
      })
      .returning();
    return toCompany(row);
  });

export const updateCompany = createServerFn({ method: "POST" })
  .inputValidator((input: UpdateCompanyInput) => input)
  .handler(async ({ data }): Promise<Company> => {
    const { id, ...fields } = data;
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.ticker !== undefined) updateData.ticker = fields.ticker || null;
    if (fields.currentPrice !== undefined)
      updateData.currentPrice = fields.currentPrice != null ? String(fields.currentPrice) : null;
    if (fields.priceAsOf !== undefined) updateData.priceAsOf = fields.priceAsOf || null;
    if (fields.isCurrent !== undefined) updateData.isCurrent = fields.isCurrent;
    if (fields.separationDate !== undefined) updateData.separationDate = fields.separationDate || null;

    const [row] = await db
      .update(equityCompanies)
      .set(updateData)
      .where(eq(equityCompanies.id, id))
      .returning();
    return toCompany(row);
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.delete(equityCompanies).where(eq(equityCompanies.id, data.id));
    return { success: true };
  });

// ── Grants ──────────────────────────────────────────────────────

export const getGrant = createServerFn({ method: "GET" })
  .inputValidator((input: { grantId: string }) => input)
  .handler(async ({ data }): Promise<GrantWithVesting | null> => {
    const [grantRow] = await db
      .select()
      .from(equityGrants)
      .where(eq(equityGrants.id, data.grantId));

    if (!grantRow) return null;

    const [companyRow] = await db
      .select()
      .from(equityCompanies)
      .where(eq(equityCompanies.id, grantRow.companyId));

    const vestRows = await db
      .select()
      .from(equityVestEvents)
      .where(eq(equityVestEvents.grantId, data.grantId))
      .orderBy(equityVestEvents.vestDate);

    const exerciseRows = await db
      .select()
      .from(equityExercises)
      .where(eq(equityExercises.grantId, data.grantId))
      .orderBy(desc(equityExercises.exerciseDate));

    const saleRows = await db
      .select()
      .from(equitySales)
      .where(eq(equitySales.grantId, data.grantId))
      .orderBy(desc(equitySales.saleDate));

    return {
      ...toGrant(grantRow),
      company: toCompany(companyRow),
      vestEvents: vestRows.map(toVestEvent),
      exercises: exerciseRows.map(toExercise),
      sales: saleRows.map(toSale),
    };
  });

export const createGrant = createServerFn({ method: "POST" })
  .inputValidator((input: CreateGrantInput) => input)
  .handler(async ({ data }): Promise<Grant> => {
    const [row] = await db
      .insert(equityGrants)
      .values({
        companyId: data.companyId,
        grantId: data.grantId || null,
        grantType: data.grantType,
        grantDate: data.grantDate,
        totalShares: String(data.totalShares),
        strikePrice: String(data.strikePrice),
        grantPrice: data.grantPrice ? String(data.grantPrice) : null,
        expirationDate: data.expirationDate || null,
        notes: data.notes || null,
      })
      .returning();

    return toGrant(row);
  });

export const updateGrant = createServerFn({ method: "POST" })
  .inputValidator((input: UpdateGrantInput) => input)
  .handler(async ({ data }): Promise<Grant> => {
    const { id, ...fields } = data;
    const updateData: Record<string, any> = {};
    if (fields.grantId !== undefined) updateData.grantId = fields.grantId || null;
    if (fields.grantType !== undefined) updateData.grantType = fields.grantType;
    if (fields.grantDate !== undefined) updateData.grantDate = fields.grantDate;
    if (fields.totalShares !== undefined) updateData.totalShares = String(fields.totalShares);
    if (fields.strikePrice !== undefined) updateData.strikePrice = String(fields.strikePrice);
    if (fields.grantPrice !== undefined)
      updateData.grantPrice = fields.grantPrice ? String(fields.grantPrice) : null;
    if (fields.expirationDate !== undefined) updateData.expirationDate = fields.expirationDate || null;
    if (fields.notes !== undefined) updateData.notes = fields.notes || null;

    const [row] = await db
      .update(equityGrants)
      .set(updateData)
      .where(eq(equityGrants.id, id))
      .returning();

    return toGrant(row);
  });

export const deleteGrant = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    // Soft delete — mark as cancelled
    const [row] = await db
      .update(equityGrants)
      .set({ status: "cancelled" })
      .where(eq(equityGrants.id, data.id))
      .returning();
    return { success: true };
  });

// ── Vest Events ─────────────────────────────────────────────────

export const updateVestEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; vestDate?: string; shares?: number; fmvAtVest?: number; status?: string }) => input,
  )
  .handler(async ({ data }): Promise<VestEvent> => {
    const updateData: Record<string, any> = {};
    if (data.vestDate !== undefined) updateData.vestDate = data.vestDate;
    if (data.shares !== undefined) updateData.shares = String(data.shares);
    if (data.fmvAtVest !== undefined) updateData.fmvAtVest = data.fmvAtVest ? String(data.fmvAtVest) : null;
    if (data.status !== undefined) updateData.status = data.status;

    const [row] = await db
      .update(equityVestEvents)
      .set(updateData)
      .where(eq(equityVestEvents.id, data.id))
      .returning();
    return toVestEvent(row);
  });

export const deleteVestEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.delete(equityVestEvents).where(eq(equityVestEvents.id, data.id));
    return { success: true };
  });

export const createVestEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { grantId: string; vestDate: string; shares: number }) => input)
  .handler(async ({ data }): Promise<VestEvent> => {
    const [row] = await db
      .insert(equityVestEvents)
      .values({
        grantId: data.grantId,
        vestDate: data.vestDate,
        shares: String(data.shares),
      })
      .returning();
    return toVestEvent(row);
  });

export const bulkCreateVestEvents = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { grantId: string; events: { vestDate: string; shares: number }[] }) => input,
  )
  .handler(async ({ data }): Promise<{ count: number }> => {
    if (data.events.length === 0) return { count: 0 };
    await db.insert(equityVestEvents).values(
      data.events.map((e) => ({
        grantId: data.grantId,
        vestDate: e.vestDate,
        shares: String(e.shares),
      })),
    );
    return { count: data.events.length };
  });

// ── Exercises ───────────────────────────────────────────────────

export const createExercise = createServerFn({ method: "POST" })
  .inputValidator((input: CreateExerciseInput) => input)
  .handler(async ({ data }): Promise<Exercise> => {
    const [row] = await db
      .insert(equityExercises)
      .values({
        grantId: data.grantId,
        referenceId: data.referenceId || null,
        exerciseDate: data.exerciseDate,
        shares: String(data.shares),
        exercisePrice: String(data.exercisePrice),
        fmvAtExercise: String(data.fmvAtExercise),
        unvestedShares: String(data.unvestedShares ?? 0),
        filed83b: data.filed83b ?? false,
        filed83bDate: data.filed83bDate || null,
        notes: data.notes || null,
      })
      .returning();
    return toExercise(row);
  });

export const updateExercise = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; referenceId?: string; exerciseDate?: string; shares?: number; fmvAtExercise?: number; exercisePrice?: number; unvestedShares?: number; filed83b?: boolean; filed83bDate?: string; notes?: string }) => input,
  )
  .handler(async ({ data }): Promise<Exercise> => {
    const { id, ...fields } = data;
    const updateData: Record<string, any> = {};
    if (fields.referenceId !== undefined) updateData.referenceId = fields.referenceId || null;
    if (fields.exerciseDate !== undefined) updateData.exerciseDate = fields.exerciseDate;
    if (fields.shares !== undefined) updateData.shares = String(fields.shares);
    if (fields.fmvAtExercise !== undefined) updateData.fmvAtExercise = String(fields.fmvAtExercise);
    if (fields.exercisePrice !== undefined) updateData.exercisePrice = String(fields.exercisePrice);
    if (fields.unvestedShares !== undefined) updateData.unvestedShares = String(fields.unvestedShares);
    if (fields.filed83b !== undefined) updateData.filed83b = fields.filed83b;
    if (fields.filed83bDate !== undefined) updateData.filed83bDate = fields.filed83bDate || null;
    if (fields.notes !== undefined) updateData.notes = fields.notes || null;

    const [row] = await db
      .update(equityExercises)
      .set(updateData)
      .where(eq(equityExercises.id, id))
      .returning();
    return toExercise(row);
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.delete(equityExercises).where(eq(equityExercises.id, data.id));
    return { success: true };
  });

// ── Sales ───────────────────────────────────────────────────────

export const createSale = createServerFn({ method: "POST" })
  .inputValidator((input: CreateSaleInput) => input)
  .handler(async ({ data }): Promise<Sale> => {
    const [row] = await db
      .insert(equitySales)
      .values({
        grantId: data.grantId,
        exerciseId: data.exerciseId || null,
        vestEventId: data.vestEventId || null,
        referenceId: data.referenceId || null,
        saleDate: data.saleDate,
        shares: String(data.shares),
        salePrice: String(data.salePrice),
        costBasisPerShare: String(data.costBasisPerShare),
        isLongTerm: data.isLongTerm,
        notes: data.notes || null,
      })
      .returning();
    return toSale(row);
  });

export const updateSale = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; exerciseId?: string; vestEventId?: string; referenceId?: string; saleDate?: string; shares?: number; salePrice?: number; costBasisPerShare?: number; isLongTerm?: boolean; notes?: string }) => input,
  )
  .handler(async ({ data }): Promise<Sale> => {
    const { id, ...fields } = data;
    const updateData: Record<string, any> = {};
    if (fields.exerciseId !== undefined) updateData.exerciseId = fields.exerciseId || null;
    if (fields.vestEventId !== undefined) updateData.vestEventId = fields.vestEventId || null;
    if (fields.referenceId !== undefined) updateData.referenceId = fields.referenceId || null;
    if (fields.saleDate !== undefined) updateData.saleDate = fields.saleDate;
    if (fields.shares !== undefined) updateData.shares = String(fields.shares);
    if (fields.salePrice !== undefined) updateData.salePrice = String(fields.salePrice);
    if (fields.costBasisPerShare !== undefined) updateData.costBasisPerShare = String(fields.costBasisPerShare);
    if (fields.isLongTerm !== undefined) updateData.isLongTerm = fields.isLongTerm;
    if (fields.notes !== undefined) updateData.notes = fields.notes || null;

    const [row] = await db
      .update(equitySales)
      .set(updateData)
      .where(eq(equitySales.id, id))
      .returning();
    return toSale(row);
  });

export const deleteSale = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.delete(equitySales).where(eq(equitySales.id, data.id));
    return { success: true };
  });

// ── Bulk Sync ───────────────────────────────────────────────────

export const vestAllPast = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ vestedCount: number; cancelledCount: number; grantsUpdated: number }> => {
    const today = new Date().toISOString().split("T")[0];

    // Build a map of company separation dates (normalize to YYYY-MM-DD)
    const companies = await db.select().from(equityCompanies);
    const separationByCompany = new Map<string, string | null>();
    for (const c of companies) {
      let sepDate: string | null = null;
      if (!c.isCurrent && c.separationDate) {
        sepDate = typeof c.separationDate === "string" && c.separationDate.includes("T")
          ? c.separationDate.split("T")[0]
          : c.separationDate;
      }
      separationByCompany.set(c.id, sepDate);
    }

    // Process all non-cancelled grants (active + fully_vested may need reclassification)
    const allGrants = await db.select().from(equityGrants)
      .where(
        or(eq(equityGrants.status, "active"), eq(equityGrants.status, "fully_vested")),
      );
    let vestedCount = 0;
    let cancelledCount = 0;
    let grantsUpdated = 0;

    for (const grant of allGrants) {
      const sepDate = separationByCompany.get(grant.companyId);
      const vestEvents = await db
        .select()
        .from(equityVestEvents)
        .where(eq(equityVestEvents.grantId, grant.id));

      for (const ve of vestEvents) {
        // Normalize vest date for comparison
        const veDate = typeof ve.vestDate === "string" && ve.vestDate.includes("T")
          ? ve.vestDate.split("T")[0]
          : ve.vestDate;

        // Forfeit vest events after separation date (even if previously marked vested)
        if (sepDate && veDate > sepDate && ve.status !== "forfeited") {
          await db
            .update(equityVestEvents)
            .set({ status: "forfeited" })
            .where(eq(equityVestEvents.id, ve.id));
          cancelledCount++;
          continue;
        }

        // Vest scheduled events on or before today
        if (ve.status === "scheduled" && veDate <= today) {
          await db
            .update(equityVestEvents)
            .set({ status: "vested" })
            .where(eq(equityVestEvents.id, ve.id));
          vestedCount++;
        }
      }

      // Re-fetch to check grant status
      const updatedEvents = await db
        .select()
        .from(equityVestEvents)
        .where(eq(equityVestEvents.grantId, grant.id));

      const nonForfeited = updatedEvents.filter((v) => v.status !== "forfeited");
      const allVested = nonForfeited.length > 0 && nonForfeited.every((v) => v.status === "vested");
      const isExpired = grant.expirationDate ? grant.expirationDate <= today : false;

      let newStatus: GrantStatus | null = null;
      if (allVested) newStatus = "fully_vested";
      else if (isExpired) newStatus = "expired";

      if (newStatus) {
        await db
          .update(equityGrants)
          .set({ status: newStatus })
          .where(eq(equityGrants.id, grant.id));
        grantsUpdated++;
      }
    }

    return { vestedCount, cancelledCount, grantsUpdated };
  },
);
