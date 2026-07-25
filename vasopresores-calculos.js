(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VasopressorCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LIMITS = Object.freeze({
    weightKg: Object.freeze({ min: 20, max: 350 }),
    heightCm: Object.freeze({ min: 100, max: 250 }),
  });

  function isFiniteInRange(value, limits) {
    return Number.isFinite(value) && value >= limits.min && value <= limits.max;
  }

  function calculateBmi(weightKg, heightCm) {
    if (!isFiniteInRange(weightKg, LIMITS.weightKg) || !isFiniteInRange(heightCm, LIMITS.heightCm)) return null;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  function calculateReferenceWeight(heightCm, targetBmi = 22.5) {
    if (!isFiniteInRange(heightCm, LIMITS.heightCm) || !Number.isFinite(targetBmi) || targetBmi <= 0) return null;
    const heightM = heightCm / 100;
    return targetBmi * heightM * heightM;
  }

  function calculateInfusionDose(ampoules, mgPerAmpoule, volumeMl, rateMlH) {
    const validPreparation = [ampoules, mgPerAmpoule, volumeMl].every(Number.isFinite)
      && ampoules > 0 && mgPerAmpoule > 0 && volumeMl > 0;
    if (!validPreparation) return null;

    const concentrationMcgMl = (ampoules * mgPerAmpoule * 1000) / volumeMl;
    const absoluteMcgMin = Number.isFinite(rateMlH) && rateMlH > 0
      ? concentrationMcgMl * rateMlH / 60
      : null;

    return { concentrationMcgMl, absoluteMcgMin };
  }

  function normalizeDose(absoluteMcgMin, weightKg) {
    if (!Number.isFinite(absoluteMcgMin) || absoluteMcgMin < 0 || !isFiniteInRange(weightKg, LIMITS.weightKg)) return null;
    return absoluteMcgMin / weightKg;
  }

  return Object.freeze({ LIMITS, calculateBmi, calculateReferenceWeight, calculateInfusionDose, normalizeDose });
});
