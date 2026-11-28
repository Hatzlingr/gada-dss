import { describe, expect, it } from "vitest";
import { laundrySeedInput } from "@/data/laundry-seed";
import { DEFAULT_GADA_OPTIONS } from "@/lib/gada/constants";
import { parseRawCell, runGadaAnalysis } from "@/lib/gada/engine";
import type { GadaInput } from "@/lib/gada/types";

const EXPECTED_WEIGHTS = [
  { code: "C1", name: "Tarif Cuci Lipat", type: "cost", delta: 0.09540558445, weight: 0.1063318181, percentage: 10.63318181, rank: 7 },
  { code: "C2", name: "Tarif Cuci Setrika", type: "cost", delta: 0.10123538456, weight: 0.1128292705, percentage: 11.28292705, rank: 4 },
  { code: "C3", name: "Tarif Paket Kilat", type: "cost", delta: 0.09161459592, weight: 0.1021066702, percentage: 10.21066702, rank: 9 },
  { code: "C4", name: "Jarak dari Kampus", type: "cost", delta: 0.10261291984, weight: 0.1143645667, percentage: 11.43645667, rank: 3 },
  { code: "C5", name: "Durasi Pengerjaan", type: "cost", delta: 0.09338861175, weight: 0.1040838535, percentage: 10.40838535, rank: 8 },
  { code: "C6", name: "Batas Minimal Berat", type: "cost", delta: 0.09606307914, weight: 0.1070646117, percentage: 10.70646117, rank: 6 },
  { code: "C7", name: "Jam Operasional", type: "benefit", delta: 0.09763558427, weight: 0.1088172065, percentage: 10.88172065, rank: 5 },
  { code: "C8", name: "Layanan Antar-Jemput", type: "benefit", delta: 0.10402543651, weight: 0.1159388505, percentage: 11.59388505, rank: 2 },
  { code: "C9", name: "Garansi Pakaian", type: "benefit", delta: 0.11526279091, weight: 0.1284631522, percentage: 12.84631522, rank: 1 },
] as const;

const EXPECTED_RANKINGS = [
  { rank: 1, name: "Laundry Bedeng Putih", gadaIndex: 0.047294, relativeScore: 0.062660 },
  { rank: 2, name: "Laundry Mbak Vivin", gadaIndex: 0.046062, relativeScore: 0.061027 },
  { rank: 3, name: "Express Pro Laundry", gadaIndex: 0.045893, relativeScore: 0.060804 },
  { rank: 4, name: "Para Laundry", gadaIndex: 0.045431, relativeScore: 0.060192 },
  { rank: 5, name: "Laundry Neng Emi", gadaIndex: 0.044375, relativeScore: 0.058792 },
  { rank: 6, name: "Sahabat Laundry", gadaIndex: 0.043984, relativeScore: 0.058274 },
  { rank: 7, name: "Nayla Laundry", gadaIndex: 0.040387, relativeScore: 0.053509 },
  { rank: 8, name: "Cekgu Laundry", gadaIndex: 0.039541, relativeScore: 0.052388 },
  { rank: 9, name: "Mely Laundry", gadaIndex: 0.039489, relativeScore: 0.052318 },
  { rank: 10, name: "Ama Laundry", gadaIndex: 0.037672, relativeScore: 0.049911 },
  { rank: 11, name: "Silvy Laundry", gadaIndex: 0.037263, relativeScore: 0.049369 },
  { rank: 12, name: "Azka Laundry", gadaIndex: 0.037025, relativeScore: 0.049054 },
  { rank: 13, name: "Laundry Pangeran", gadaIndex: 0.035437, relativeScore: 0.046950 },
  { rank: 14, name: "Sanshan Laundry", gadaIndex: 0.032842, relativeScore: 0.043512 },
  { rank: 15, name: "Pasti Fresh Laundry", gadaIndex: 0.032252, relativeScore: 0.042731 },
  { rank: 16, name: "Apix Laundry", gadaIndex: 0.030990, relativeScore: 0.041059 },
  { rank: 17, name: "Rolansa Laundry", gadaIndex: 0.030250, relativeScore: 0.040079 },
  { rank: 18, name: "DMA Laundry", gadaIndex: 0.029855, relativeScore: 0.039555 },
  { rank: 19, name: "Zeva Laundry", gadaIndex: 0.029791, relativeScore: 0.039471 },
  { rank: 20, name: "Kaysha Laundry", gadaIndex: 0.028940, relativeScore: 0.038343 },
] as const;

describe("Layer A: parseRawCell universal parser", () => {
  it("parses distance units in m and km into meters", () => {
    expect(parseRawCell("800 m")).toBe(800);
    expect(parseRawCell("3000m")).toBe(3000);
    expect(parseRawCell("4.5 km")).toBe(4500);
    expect(parseRawCell("4,5 km")).toBe(4500);
  });

  it("parses duration, weight units, and currency formats", () => {
    expect(parseRawCell("3 hari")).toBe(3);
    expect(parseRawCell("2 kg")).toBe(2);
    expect(parseRawCell("Rp 5.000")).toBe(5000);
    expect(parseRawCell("$12.50")).toBe(12.5);
  });

  it("parses operating time ranges including overnight hours", () => {
    expect(parseRawCell("08.00 - 18.00")).toBe(10);
    expect(parseRawCell("07.00 - 21.30")).toBe(14.5);
    expect(parseRawCell("09:00-18:00")).toBe(9);
    expect(parseRawCell("22.00 - 06.00")).toBe(8);
  });

  it("maps case-insensitive binary text and missing markers", () => {
    expect(parseRawCell("Ya", DEFAULT_GADA_OPTIONS)).toBe(5);
    expect(parseRawCell("yes", DEFAULT_GADA_OPTIONS)).toBe(5);
    expect(parseRawCell("true", DEFAULT_GADA_OPTIONS)).toBe(5);
    expect(parseRawCell("Tidak", DEFAULT_GADA_OPTIONS)).toBe(1);
    expect(parseRawCell("no", DEFAULT_GADA_OPTIONS)).toBe(1);
    expect(parseRawCell("false", DEFAULT_GADA_OPTIONS)).toBe(1);

    expect(parseRawCell("")).toBeNull();
    expect(parseRawCell("-")).toBeNull();
    expect(parseRawCell("N/A")).toBeNull();
    expect(parseRawCell("null")).toBeNull();
    expect(parseRawCell(null)).toBeNull();
    expect(parseRawCell(undefined)).toBeNull();
  });
});

describe("UNSRI Laundry Seed Benchmark (Group 6)", () => {
  const result = runGadaAnalysis(laundrySeedInput);

  it("auto-drops Pembayaran QRIS for zero variance and keeps 9 active criteria", () => {
    expect(result.activeCriteria).toHaveLength(9);
    expect(result.activeCriteria.map((c) => c.code)).toEqual([
      "C1",
      "C2",
      "C3",
      "C4",
      "C5",
      "C6",
      "C7",
      "C8",
      "C9",
    ]);

    expect(result.excludedCriteria).toHaveLength(1);
    expect(result.excludedCriteria[0]).toMatchObject({
      code: "QRIS",
      name: "Pembayaran QRIS",
      reason: "zero_variance",
    });
  });

  it("logs exact Layer B imputations for C1, C3, and C6", () => {
    const c1Logs = result.imputationLogs.filter((l) => l.criterionCode === "C1");
    expect(c1Logs).toHaveLength(1);
    expect(c1Logs[0]).toMatchObject({
      alternativeName: "Apix Laundry",
      imputedValue: 6000,
      strategy: "penalty_max",
    });

    const c3Logs = result.imputationLogs.filter((l) => l.criterionCode === "C3");
    expect(c3Logs.map((l) => l.alternativeName)).toEqual([
      "Laundry Pangeran",
      "Mely Laundry",
      "Zeva Laundry",
      "Rolansa Laundry",
    ]);
    for (const log of c3Logs) {
      expect(log.imputedValue).toBe(20000);
      expect(log.strategy).toBe("custom_penalty");
    }

    const c6Logs = result.imputationLogs.filter((l) => l.criterionCode === "C6");
    expect(c6Logs.map((l) => l.alternativeName)).toEqual([
      "Laundry Neng Emi",
      "Nayla Laundry",
      "Sahabat Laundry",
    ]);
    for (const log of c6Logs) {
      expect(log.imputedValue).toBe(1);
      expect(log.strategy).toBe("min_value");
    }
  });

  it("matches all 9 criterion weights within < 1e-6 and sum invariant < 1e-9", () => {
    expect(result.criteriaWeights).toHaveLength(9);

    EXPECTED_WEIGHTS.forEach((expected, index) => {
      const actual = result.criteriaWeights[index];
      expect(actual).toBeDefined();
      expect(actual?.code).toBe(expected.code);
      expect(actual?.name).toBe(expected.name);
      expect(actual?.type).toBe(expected.type);
      expect(actual?.rank).toBe(expected.rank);
      expect(Math.abs((actual?.simulatedDelta ?? 0) - expected.delta)).toBeLessThan(1e-6);
      expect(Math.abs((actual?.normalizedWeight ?? 0) - expected.weight)).toBeLessThan(1e-6);
      expect(Math.abs((actual?.percentage ?? 0) - expected.percentage)).toBeLessThan(1e-2);
    });

    const weightSum = result.criteriaWeights.reduce(
      (sum, item) => sum + item.normalizedWeight,
      0
    );
    expect(Math.abs(weightSum - 1)).toBeLessThan(1e-9);
  });

  it("matches respondent consistency bounds, AGRPC invariants, and spot checks", () => {
    expect(result.respondentConsistency).toHaveLength(30);

    for (const item of result.respondentConsistency) {
      expect(item.alpha).toBeGreaterThanOrEqual(0.745805);
      expect(item.alpha).toBeLessThanOrEqual(0.892547);
      expect(item.sqrtAlpha).toBeGreaterThanOrEqual(0.863600);
      expect(item.sqrtAlpha).toBeLessThanOrEqual(0.944747);
      expect(["high", "moderate"]).toContain(item.status);
    }

    const agrpc = result.auditTrace.agrpcMatrix;
    expect(agrpc).toHaveLength(30);
    for (let i = 0; i < agrpc.length; i++) {
      expect(agrpc[i]?.[i]).toBeCloseTo(1, 12);
      for (let j = 0; j < agrpc.length; j++) {
        const entry = agrpc[i]?.[j] ?? 0;
        expect(entry).toBeGreaterThan(0.5);
        expect(entry).toBeLessThanOrEqual(1);
        expect(entry).toBeCloseTo(agrpc[j]?.[i] ?? 0, 12);
      }
    }

    const r1 = result.respondentConsistency[0];
    expect(r1?.name).toBe("R");
    expect(r1?.signedArea).toBeCloseTo(-0.08, 6);
    expect(r1?.absSignedArea).toBeCloseTo(0.08, 6);
    expect(Math.abs((r1?.sqrtAlpha ?? 0) - 0.9404015995)).toBeLessThan(1e-6);

    const r2 = result.respondentConsistency[1];
    expect(r2?.signedArea).toBeCloseTo(0, 12);
    expect(r2?.absSignedArea).toBeCloseTo(0, 12);
    expect(Math.abs((r2?.sqrtAlpha ?? 0) - 0.9447463221)).toBeLessThan(1e-6);

    const r6 = result.respondentConsistency[5];
    expect(r6?.name).toBe("Anis");
    expect(Math.abs((r6?.signedArea ?? 0) - -4 / 11)).toBeLessThan(1e-6);
    expect(Math.abs((r6?.absSignedArea ?? 0) - 4 / 11)).toBeLessThan(1e-6);
    expect(Math.abs((r6?.sqrtAlpha ?? 0) - 0.8960050902)).toBeLessThan(1e-6);
  });

  it("matches all 20 laundry rankings within < 1e-6 and sum invariant < 1e-9", () => {
    expect(result.rankings).toHaveLength(20);

    EXPECTED_RANKINGS.forEach((expected, index) => {
      const actual = result.rankings[index];
      expect(actual).toBeDefined();
      expect(actual?.rank).toBe(expected.rank);
      expect(actual?.name).toBe(expected.name);
      expect(Math.abs((actual?.gadaIndex ?? 0) - expected.gadaIndex)).toBeLessThan(1e-6);
      expect(Math.abs((actual?.relativeScore ?? 0) - expected.relativeScore)).toBeLessThan(1e-6);
    });

    const relativeSum = result.rankings.reduce(
      (sum, item) => sum + item.relativeScore,
      0
    );
    expect(Math.abs(relativeSum - 1)).toBeLessThan(1e-9);

    // Spot check RO matrix values for Laundry Bedeng Putih (alternative index 0)
    const roRow0 = result.auditTrace.reciprocatedMatrix[0];
    expect(roRow0?.[0]).toBeCloseTo(1 / 4500, 9);
    expect(roRow0?.[3]).toBeCloseTo(1 / 800, 9);
    expect(roRow0?.[6]).toBeCloseTo(10, 9);
    expect(roRow0?.[7]).toBe(5);
    expect(roRow0?.[8]).toBe(5);
  });
});

describe("Edge Cases, Guards, and Multi-Domain Generality", () => {
  it("rejects zero or negative values in active alternative cells with descriptive errors", () => {
    const zeroInput: GadaInput = {
      ...laundrySeedInput,
      alternativeValues: {
        ...laundrySeedInput.alternativeValues,
        "alt-1": {
          ...laundrySeedInput.alternativeValues["alt-1"],
          c1: 0,
        },
      },
    };
    expect(() => runGadaAnalysis(zeroInput)).toThrow(/Laundry Bedeng Putih.*Tarif Cuci Lipat/);

    const negativeInput: GadaInput = {
      ...laundrySeedInput,
      alternativeValues: {
        ...laundrySeedInput.alternativeValues,
        "alt-2": {
          ...laundrySeedInput.alternativeValues["alt-2"],
          c4: -50,
        },
      },
    };
    expect(() => runGadaAnalysis(negativeInput)).toThrow(/Laundry Pangeran.*Jarak dari Kampus/);
  });

  it("rejects zero or negative respondent scores", () => {
    const invalidRespInput: GadaInput = {
      ...laundrySeedInput,
      respondentScores: {
        ...laundrySeedInput.respondentScores,
        "resp-1": {
          ...laundrySeedInput.respondentScores["resp-1"],
          c2: 0,
        },
      },
    };
    expect(() => runGadaAnalysis(invalidRespInput)).toThrow(/strictly > 0/);
  });

  it("enforces minimum dimension guards (M < 2, S = 0, N = 0)", () => {
    const tooFewCriteria: GadaInput = {
      ...laundrySeedInput,
      criteria: laundrySeedInput.criteria.slice(0, 1),
    };
    expect(() => runGadaAnalysis(tooFewCriteria)).toThrow(/At least 2 active criteria/);

    const zeroVarianceCollapse: GadaInput = {
      ...laundrySeedInput,
      criteria: [
        laundrySeedInput.criteria[0]!,
        laundrySeedInput.criteria[8]!, // QRIS (zero variance)
      ],
    };
    expect(() => runGadaAnalysis(zeroVarianceCollapse)).toThrow(/non-zero variance/);

    const emptyAlternatives: GadaInput = {
      ...laundrySeedInput,
      alternatives: [],
    };
    expect(() => runGadaAnalysis(emptyAlternatives)).toThrow(/At least 1 alternative/);

    const emptyRespondents: GadaInput = {
      ...laundrySeedInput,
      respondents: [],
    };
    expect(() => runGadaAnalysis(emptyRespondents)).toThrow(/At least 1 respondent/);
  });

  it("handles uniform respondents cleanly and computes M = 2 signed area", () => {
    const twoCriteriaInput: GadaInput = {
      datasetName: "Minimal M=2 Check",
      criteria: [
        { id: "k1", code: "K1", name: "Price", type: "cost", missingStrategy: "penalty_max", active: true },
        { id: "k2", code: "K2", name: "Rating", type: "benefit", missingStrategy: "min_value", active: true },
      ],
      alternatives: [
        { id: "a1", name: "Option A" },
        { id: "a2", name: "Option B" },
      ],
      respondents: [
        { id: "r1", name: "Uniform User" },
        { id: "r2", name: "Skewed User" },
      ],
      alternativeValues: {
        a1: { k1: 100, k2: 4 },
        a2: { k1: 150, k2: 5 },
      },
      respondentScores: {
        r1: { k1: 5, k2: 5 },
        r2: { k1: 2, k2: 4 },
      },
      options: { ...DEFAULT_GADA_OPTIONS },
    };

    const output = runGadaAnalysis(twoCriteriaInput);
    const r1 = output.respondentConsistency[0];
    const r2 = output.respondentConsistency[1];

    expect(output.auditTrace.zeroPointMatrix[0]).toEqual([0, 0]);
    expect(r1?.signedArea).toBe(0);
    expect(r1?.alpha).toBeGreaterThan(0.5);
    expect(Number.isNaN(r1?.sqrtAlpha)).toBe(false);

    // For M = 2, s_i = 0.5 * (beta_2 - beta_1) = 0.5 * (4/6 - 2/6) = 1/6
    expect(r2?.signedArea).toBeCloseTo(1 / 6, 12);
  });

  it("computes arbitrary non-laundry 5x4x3 dataset accurately", () => {
    const boardingHouseInput: GadaInput = {
      datasetName: "UNSRI Boarding House Selection",
      criteria: [
        { id: "rent", code: "B1", name: "Monthly Rent", type: "cost", missingStrategy: "penalty_max", active: true },
        { id: "dist", code: "B2", name: "Distance", type: "cost", missingStrategy: "penalty_max", active: true },
        { id: "area", code: "B3", name: "Room Size", type: "benefit", missingStrategy: "min_value", active: true },
        { id: "wifi", code: "B4", name: "WiFi Included", type: "benefit", missingStrategy: "min_value", active: true, isBinary: true },
      ],
      alternatives: [
        { id: "k1", name: "Kost Melati" },
        { id: "k2", name: "Kost Anggrek" },
        { id: "k3", name: "Kost Mawar" },
        { id: "k4", name: "Kost Kenanga" },
        { id: "k5", name: "Kost Tulip" },
      ],
      respondents: [
        { id: "u1", name: "Student A" },
        { id: "u2", name: "Student B" },
        { id: "u3", name: "Student C" },
      ],
      alternativeValues: {
        k1: { rent: "Rp 850.000", dist: "400 m", area: 12, wifi: "Ya" },
        k2: { rent: "Rp 1.100.000", dist: "0.2 km", area: 16, wifi: "Ya" },
        k3: { rent: "Rp 700.000", dist: "1.5 km", area: 9, wifi: "Tidak" },
        k4: { rent: "-", dist: "600 m", area: 14, wifi: "Ya" },
        k5: { rent: 950000, dist: "800 m", area: 15, wifi: "Tidak" },
      },
      respondentScores: {
        u1: { rent: 5, dist: 4, area: 3, wifi: 4 },
        u2: { rent: 4, dist: 5, area: 3, wifi: 5 },
        u3: { rent: 5, dist: 3, area: 4, wifi: 4 },
      },
      options: { ...DEFAULT_GADA_OPTIONS },
    };

    const output = runGadaAnalysis(boardingHouseInput);
    expect(output.activeCriteria).toHaveLength(4);
    expect(output.imputationLogs).toHaveLength(1);
    expect(output.imputationLogs[0]?.imputedValue).toBe(1100000);
    expect(output.rankings).toHaveLength(5);

    const wSum = output.criteriaWeights.reduce((acc, w) => acc + w.normalizedWeight, 0);
    const rSum = output.rankings.reduce((acc, r) => acc + r.relativeScore, 0);
    expect(Math.abs(wSum - 1)).toBeLessThan(1e-9);
    expect(Math.abs(rSum - 1)).toBeLessThan(1e-9);
  });
});
