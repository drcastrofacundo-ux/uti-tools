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

  // Peso predicho de Devine, dependiente del sexo. No reemplaza a
  // calculateReferenceWeight: aquel es el denominador transparente de Peterson
  // para noradrenalina, este es el peso con el que MIRA dosifica midazolam y
  // UTI Ronda indexa el volumen corriente y el débito urinario. Se muestran los
  // dos, con nombres distintos, porque responden preguntas distintas.
  function calculatePredictedBodyWeight(heightCm, sex) {
    if (!isFiniteInRange(heightCm, LIMITS.heightCm)) return null;
    if (sex !== 'female' && sex !== 'male') return null;
    const predicted = (sex === 'female' ? 45.5 : 50) + 0.91 * (heightCm - 152.4);
    return predicted >= LIMITS.weightKg.min ? predicted : null;
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

  // Camino inverso de calculateInfusionDose: se indica la dosis que se quiere y
  // devuelve la velocidad de bomba que la produce con esa dilución. La unidad de
  // la dosis viaja explícita en perKg y perMinute en vez de asumirse, porque no
  // todas las drogas se dosifican igual: noradrenalina en mcg/kg/min y
  // dexmedetomidina en mcg/kg/h, por ejemplo.
  const MAX_PUMP_RATE_ML_H = 1000;

  function calculateRateFromDose(input) {
    const doseValue = input && input.doseValue;
    const concentrationMcgMl = input && input.concentrationMcgMl;
    const perKg = Boolean(input && input.perKg);
    const perMinute = Boolean(input && input.perMinute);
    const weightKg = input && input.weightKg;

    if (!Number.isFinite(doseValue) || doseValue < 0) return null;
    if (!Number.isFinite(concentrationMcgMl) || concentrationMcgMl <= 0) return null;
    if (perKg && !isFiniteInRange(weightKg, LIMITS.weightKg)) return null;

    const mcgPerHour = doseValue * (perMinute ? 60 : 1) * (perKg ? weightKg : 1);
    const rateMlH = mcgPerHour / concentrationMcgMl;
    return Object.freeze({
      rateMlH,
      mcgPerHour,
      beyondPumpRange: rateMlH > MAX_PUMP_RATE_ML_H,
    });
  }

  function normalizeDose(absoluteMcgMin, weightKg) {
    if (!Number.isFinite(absoluteMcgMin) || absoluteMcgMin < 0 || !isFiniteInRange(weightKg, LIMITS.weightKg)) return null;
    return absoluteMcgMin / weightKg;
  }

  function getNorepinephrineAbsoluteScale(absoluteMcgMin, scaleMaxMcgMin = 60) {
    if (!Number.isFinite(absoluteMcgMin) || absoluteMcgMin < 0) return null;
    if (!Number.isFinite(scaleMaxMcgMin) || scaleMaxMcgMin <= 0) return null;
    return Object.freeze({
      positionPercent: Math.min(absoluteMcgMin / scaleMaxMcgMin, 1) * 100,
      beyondObservedRange: absoluteMcgMin > scaleMaxMcgMin,
      scaleMaxMcgMin,
    });
  }

  function getSofa2CardiovascularFromNorepinephrine(absoluteMcgMin, actualWeightKg) {
    const doseMcgKgMin = normalizeDose(absoluteMcgMin, actualWeightKg);
    if (doseMcgKgMin === null || doseMcgKgMin === 0) return null;
    if (doseMcgKgMin <= 0.2) return Object.freeze({ doseMcgKgMin, points: 2, stratum: '≤0.2 µg/kg/min' });
    if (doseMcgKgMin <= 0.4) return Object.freeze({ doseMcgKgMin, points: 3, stratum: '>0.2–0.4 µg/kg/min' });
    return Object.freeze({ doseMcgKgMin, points: 4, stratum: '>0.4 µg/kg/min' });
  }

  return Object.freeze({ LIMITS, MAX_PUMP_RATE_ML_H, calculateBmi, calculateReferenceWeight, calculatePredictedBodyWeight, calculateInfusionDose, calculateRateFromDose, normalizeDose, getNorepinephrineAbsoluteScale, getSofa2CardiovascularFromNorepinephrine });
});
