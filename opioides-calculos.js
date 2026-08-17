(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpioidCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LIMITS = Object.freeze({
    weightKg: Object.freeze({ min: 20, max: 350 }),
    heightCm: Object.freeze({ min: 100, max: 250 }),
    ageYears: Object.freeze({ min: 18, max: 120 }),
    hours: Object.freeze({ min: 0.1, max: 24 * 365 }),
  });

  const DRUGS = Object.freeze({
    morphine: Object.freeze({
      label: 'Morfina', ampouleUnit: 'mg', amountPerAmpoule: 10, presentation: '10 mg/1 mL', primaryUnit: 'mg/h', normalizedUnit: 'mg/kg/h',
      reference: Object.freeze({ basis: 'absolute', min: 1, max: 10, unit: 'mg/h' }),
    }),
    fentanyl: Object.freeze({
      label: 'Fentanilo', ampouleUnit: 'µg', amountPerAmpoule: 500, presentation: '500 µg/ampolla', primaryUnit: 'µg/h', normalizedUnit: 'µg/kg/h',
      reference: Object.freeze({ basis: 'normalized', min: 0.5, max: 3, unit: 'µg/kg/h' }),
    }),
    remifentanil: Object.freeze({
      label: 'Remifentanilo', ampouleUnit: 'mg', amountPerAmpoule: 5, presentation: '5 mg/ampolla', primaryUnit: 'µg/min', normalizedUnit: 'µg/kg/min',
      reference: Object.freeze({ basis: 'normalized', min: 0.025, max: 0.2, unit: 'µg/kg/min' }),
    }),
    dexmedetomidine: Object.freeze({
      label: 'Dexmedetomidina', ampouleUnit: 'µg', amountPerAmpoule: 200, presentation: '200 µg/ampolla', primaryUnit: 'µg/h', normalizedUnit: 'µg/kg/h',
      reference: Object.freeze({ basis: 'normalized', min: 0.2, max: 0.7, unit: 'µg/kg/h' }),
      adjunct: true,
    }),
  });

  function inRange(value, limits) {
    return Number.isFinite(value) && value >= limits.min && value <= limits.max;
  }

  function calculateBmi(weightKg, heightCm) {
    if (!inRange(weightKg, LIMITS.weightKg) || !inRange(heightCm, LIMITS.heightCm)) return null;
    return weightKg / Math.pow(heightCm / 100, 2);
  }

  function calculateReferenceWeight(heightCm, targetBmi = 22.5) {
    if (!inRange(heightCm, LIMITS.heightCm) || !Number.isFinite(targetBmi) || targetBmi <= 0) return null;
    return targetBmi * Math.pow(heightCm / 100, 2);
  }

  function calculateEgfrCkdEpi2021(creatinineMgDl, ageYears, sex) {
    if (!Number.isFinite(creatinineMgDl) || creatinineMgDl <= 0 || !inRange(ageYears, LIMITS.ageYears)) return null;
    if (sex !== 'female' && sex !== 'male') return null;
    const female = sex === 'female';
    const k = female ? 0.7 : 0.9;
    const alpha = female ? -0.241 : -0.302;
    const ratio = creatinineMgDl / k;
    return 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.2)
      * Math.pow(0.9938, ageYears) * (female ? 1.012 : 1);
  }

  function durationToHours(value, unit) {
    if (!Number.isFinite(value) || value <= 0) return null;
    const hours = unit === 'days' ? value * 24 : value;
    return inRange(hours, LIMITS.hours) ? hours : null;
  }

  function calculateInfusion(input) {
    const drug = DRUGS[input.drugKey];
    const valid = drug && [input.ampoules, drug && drug.amountPerAmpoule, input.volumeMl, input.rateMlH]
      .every(Number.isFinite) && input.ampoules > 0 && drug.amountPerAmpoule > 0
      && input.volumeMl > 0 && input.rateMlH >= 0;
    if (!valid || !inRange(input.weightKg, LIMITS.weightKg)) return null;

    const totalAmpouleUnits = input.ampoules * drug.amountPerAmpoule;
    const concentrationAmpouleUnitsMl = totalAmpouleUnits / input.volumeMl;
    const deliveredAmpouleUnitsH = concentrationAmpouleUnitsMl * input.rateMlH;
    let absoluteRate;

    if (input.drugKey === 'remifentanil') absoluteRate = deliveredAmpouleUnitsH * 1000 / 60;
    else absoluteRate = deliveredAmpouleUnitsH;

    const normalizedRate = absoluteRate / input.weightKg;
    const hours = durationToHours(input.durationValue, input.durationUnit);
    if (hours === null) return null;

    let cumulativeValue;
    let cumulativeUnit;
    if (input.drugKey === 'remifentanil') {
      cumulativeValue = absoluteRate * 60 * hours / 1000;
      cumulativeUnit = 'mg';
    } else {
      cumulativeValue = deliveredAmpouleUnitsH * hours;
      cumulativeUnit = drug.ampouleUnit;
    }

    return Object.freeze({
      drugKey: input.drugKey,
      concentration: concentrationAmpouleUnitsMl,
      concentrationUnit: `${drug.ampouleUnit}/mL`,
      absoluteRate,
      absoluteUnit: drug.primaryUnit,
      normalizedRate,
      normalizedUnit: drug.normalizedUnit,
      hours,
      cumulativeValue,
      cumulativeUnit,
      cumulativePerKg: cumulativeValue / input.weightKg,
      cumulativePerKgUnit: `${cumulativeUnit}/kg`,
    });
  }

  // Camino inverso de calculateInfusion: se indica la dosis que se quiere y
  // devuelve la velocidad de bomba que la produce. La dosis se expresa en la
  // unidad de referencia de cada droga, que no es la misma para todas:
  // morfina en mg/h absolutos, fentanilo y dexmedetomidina en µg/kg/h, y
  // remifentanilo en µg/kg/min. Por eso la unidad se devuelve junto al número,
  // para que la interfaz la escriba al lado del campo y no haya que adivinarla.
  function calculateRateForTargetDose(input) {
    const drug = DRUGS[input && input.drugKey];
    if (!drug) return null;
    const targetDose = input.targetDose;
    if (!Number.isFinite(targetDose) || targetDose < 0) return null;
    if (![input.ampoules, input.volumeMl].every(Number.isFinite)) return null;
    if (input.ampoules <= 0 || input.volumeMl <= 0) return null;

    const perKg = drug.reference.basis === 'normalized';
    if (perKg && !inRange(input.weightKg, LIMITS.weightKg)) return null;

    const concentrationAmpouleUnitsMl = (input.ampoules * drug.amountPerAmpoule) / input.volumeMl;
    if (!(concentrationAmpouleUnitsMl > 0)) return null;

    const absoluteRate = perKg ? targetDose * input.weightKg : targetDose;
    // El remifentanilo se informa en µg/min y la ampolla viene en mg: hay que
    // pasar a mg/h antes de dividir por la concentración.
    const deliveredAmpouleUnitsH = input.drugKey === 'remifentanil'
      ? absoluteRate * 60 / 1000
      : absoluteRate;

    const rateMlH = deliveredAmpouleUnitsH / concentrationAmpouleUnitsMl;
    return Object.freeze({
      drugKey: input.drugKey,
      rateMlH,
      targetDose,
      targetUnit: drug.reference.unit,
      absoluteRate,
      absoluteUnit: drug.primaryUnit,
      withinReference: targetDose >= drug.reference.min && targetDose <= drug.reference.max,
      referenceMin: drug.reference.min,
      referenceMax: drug.reference.max,
      beyondPumpRange: rateMlH > 1000,
    });
  }

  function classifyReferencePosition(drugKey, result) {
    const drug = DRUGS[drugKey];
    if (!drug || !result) return null;
    const value = drug.reference.basis === 'absolute' ? result.absoluteRate : result.normalizedRate;
    let key = 'within';
    let label = 'Dentro del rango de infusión citado';
    if (value < drug.reference.min) { key = 'below'; label = 'Por debajo del rango de infusión citado'; }
    if (value > drug.reference.max) { key = 'above'; label = 'Por encima del rango de infusión citado'; }
    return Object.freeze({ key, label, value, ...drug.reference });
  }

  function buildClinicalAssessment(input, result) {
    if (!result || !DRUGS[result.drugKey]) return null;
    const flags = [];
    const cautions = [];
    const bmi = calculateBmi(input.weightKg, input.heightCm);
    const ageValid = inRange(input.ageYears, LIMITS.ageYears);
    const renalStatus = ['stable', 'aki-no-krt', 'aki-ihd', 'aki-ckrt', 'aki-sled', 'chronic-ihd'].includes(input.renalStatus)
      ? input.renalStatus : 'stable';
    const egfr = renalStatus === 'stable'
      ? calculateEgfrCkdEpi2021(input.creatinineMgDl, input.ageYears, input.sex)
      : null;
    const onKrt = ['aki-ihd', 'aki-ckrt', 'aki-sled', 'chronic-ihd'].includes(renalStatus);
    const hepatic = ['none', 'moderate', 'severe'].includes(input.hepatic) ? input.hepatic : 'unknown';

    if (result.hours >= 72) flags.push('Exposición ≥72 h: vigilar dependencia física y abstinencia al reducir o suspender.');
    if (ageValid && input.ageYears >= 65) cautions.push('Edad ≥65 años: puede aumentar la sensibilidad a opioides y sedantes.');
    if (input.chronicOpioid) flags.push('Uso crónico previo de opioides: la tolerancia y la retirada requieren valoración individual.');
    if (input.concurrentBenzodiazepine) flags.push('Benzodiazepina concomitante: suma depresión del SNC y puede superponer otro síndrome de abstinencia.');
    if (renalStatus === 'aki-no-krt') flags.push('IRA en evolución: CKD-EPI no es confiable con creatinina no estable; integrar tendencia, diuresis y contexto.');
    if (renalStatus.startsWith('aki-') && onKrt) flags.push('IRA con reemplazo renal: no equivale a enfermedad renal terminal y puede recuperar función; reevaluar la situación renal diariamente.');
    if (renalStatus === 'chronic-ihd') flags.push('Hemodiálisis crónica: no calcular CKD-EPI; considerar función residual y momento/modalidad de la sesión.');

    if (result.drugKey === 'morphine') {
      if (egfr !== null && egfr < 60) flags.push('Función renal reducida: pueden acumularse M3G/M6G; el efecto puede persistir tras bajar la bomba.');
      if (egfr !== null && egfr < 30) cautions.push('TFGe <30 mL/min/1,73 m²: riesgo marcado de persistencia por metabolitos de morfina.');
      if (renalStatus !== 'stable') cautions.push('IRA o reemplazo renal: pueden acumularse M3G/M6G; la depuración extracorpórea no garantiza desaparición inmediata del efecto.');
      if (hepatic !== 'none' && hepatic !== 'unknown') flags.push('Disfunción hepática: el aclaramiento de morfina puede disminuir.');
    }
    if (result.drugKey === 'fentanyl') {
      if (result.hours >= 24) flags.push('Infusión sostenida: la lipofilia y el gran volumen de distribución pueden prolongar el despertar.');
      if (hepatic !== 'none' && hepatic !== 'unknown') flags.push('Disfunción hepática: revisar persistencia y respuesta por metabolismo hepático del fentanilo.');
      if (bmi !== null && bmi >= 30) cautions.push('Obesidad: conservar dosis absoluta y por peso; no asumir que el peso real predice la concentración efectiva.');
      if (onKrt) cautions.push('El fentanilo se depura poco mediante reemplazo renal: no asumir que una sesión eliminará una exposición acumulada.');
    }
    if (result.drugKey === 'remifentanil') {
      flags.push('El remifentanilo no presenta acumulación clínicamente relevante dependiente del contexto como fentanilo o morfina.');
      if (result.hours >= 72) cautions.push('El offset rápido no evita tolerancia, hiperalgesia o abstinencia después de exposición prolongada.');
      if (egfr !== null && egfr < 30) cautions.push('La insuficiencia renal prolonga la vida media del metabolito inactivo; no equivale a acumulación opioide activa.');
      if (onKrt) cautions.push('El reemplazo renal no exige por sí solo ajustar remifentanilo activo; el metabolito ácido inactivo puede acumularse y se elimina parcialmente por diálisis.');
    }
    if (result.drugKey === 'dexmedetomidine') {
      flags.push('Coadyuvante no opioide: no sumar ni convertir como equivalente analgésico.');
      if (result.hours >= 24) cautions.push('Exposición prolongada: vigilar bradicardia, hipotensión y síntomas de retirada al reducir.');
    }

    return Object.freeze({ bmi, egfr, renalStatus, onKrt, flags: Object.freeze(flags), cautions: Object.freeze(cautions) });
  }

  function calculateFirstTaperStep(rateMlH, percent = 10) {
    if (!Number.isFinite(rateMlH) || rateMlH <= 0 || !Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
    return Object.freeze({ currentRateMlH: rateMlH, percent, exampleRateMlH: rateMlH * (1 - percent / 100) });
  }

  return Object.freeze({
    LIMITS, DRUGS, calculateBmi, calculateReferenceWeight, calculateEgfrCkdEpi2021, durationToHours,
    calculateInfusion, calculateRateForTargetDose, classifyReferencePosition, buildClinicalAssessment, calculateFirstTaperStep,
  });
});
