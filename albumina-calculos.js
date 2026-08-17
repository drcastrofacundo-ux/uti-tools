(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AlbuminCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // El cociente PCR/albúmina está calibrado con PCR en mg/L sobre albúmina en
  // g/dL, así que mg/L es la unidad canónica de esta herramienta. MIRA, en
  // cambio, escala su factor inflamatorio con PCR en mg/dL. Cargar el mismo
  // valor de laboratorio en las dos sin convertirlo mete un error de diez veces
  // en el IRAM, y el IRAM decide el plan de destete de midazolam. Por eso la
  // unidad viaja explícita junto al número y la conversión vive en un solo lado.
  const CANONICAL_CRP_UNIT = 'mg/L';
  const CRP_UNIT_FACTORS_TO_MG_L = Object.freeze({ 'mg/L': 1, 'mg/dL': 10 });
  const CRP_UNITS = Object.freeze(Object.keys(CRP_UNIT_FACTORS_TO_MG_L));

  function isValidCrp(value) {
    return Number.isFinite(value) && value >= 0;
  }

  function normalizeCrp(value, unit) {
    const factor = CRP_UNIT_FACTORS_TO_MG_L[unit];
    if (!factor) return null;
    if (!isValidCrp(value)) return null;
    return value * factor;
  }

  function convertCrpToMgDl(valueMgL) {
    if (!isValidCrp(valueMgL)) return null;
    return valueMgL / CRP_UNIT_FACTORS_TO_MG_L['mg/dL'];
  }

  function isValidAlbumin(value) {
    return Number.isFinite(value) && value > 0;
  }

  function calculateCrpAlbuminRatio(crpMgL, albuminGDl) {
    if (!isValidCrp(crpMgL) || !isValidAlbumin(albuminGDl)) return null;
    return crpMgL / albuminGDl;
  }

  function classifyCrpAlbuminRatio(ratio) {
    if (!Number.isFinite(ratio) || ratio < 0) return null;
    if (ratio <= 25) {
      return Object.freeze({ key: 'historical-reference', label: 'Dentro del rango histórico citado' });
    }
    if (ratio < 61) {
      return Object.freeze({ key: 'elevated', label: 'Cociente elevado' });
    }
    if (ratio < 74) {
      return Object.freeze({ key: 'published-threshold', label: 'Supera un umbral pronóstico publicado' });
    }
    return Object.freeze({ key: 'higher-published-range', label: 'En o por encima del rango pronóstico 74–86' });
  }

  function calculateRatioTrend(previousCrpMgL, previousAlbuminGDl, currentCrpMgL, currentAlbuminGDl) {
    const previousRatio = calculateCrpAlbuminRatio(previousCrpMgL, previousAlbuminGDl);
    const currentRatio = calculateCrpAlbuminRatio(currentCrpMgL, currentAlbuminGDl);
    if (previousRatio === null || currentRatio === null) return null;

    const absoluteDelta = currentRatio - previousRatio;
    const percentChange = previousRatio === 0 ? null : absoluteDelta / previousRatio * 100;
    const direction = Math.abs(absoluteDelta) < 1e-12
      ? 'unchanged'
      : absoluteDelta < 0 ? 'decrease' : 'increase';

    return Object.freeze({ previousRatio, currentRatio, absoluteDelta, percentChange, direction });
  }

  return Object.freeze({
    CANONICAL_CRP_UNIT,
    CRP_UNITS,
    normalizeCrp,
    convertCrpToMgDl,
    isValidCrp,
    isValidAlbumin,
    calculateCrpAlbuminRatio,
    classifyCrpAlbuminRatio,
    calculateRatioTrend,
  });
});
