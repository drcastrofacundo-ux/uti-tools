(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OxygenTransportCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const CONSTANTS = Object.freeze({
    hufnerMlO2PerGram: 1.34,
    dissolvedOxygenMlDlPerMmHg: 0.0031,
    decilitersPerLiter: 10,
  });

  const LIMITS = Object.freeze({
    hemoglobinGDl: Object.freeze({ min: 0, max: 30 }),
    saturationPercent: Object.freeze({ min: 0, max: 100 }),
    paO2MmHg: Object.freeze({ min: 0, max: 2000 }),
    caO2MlDl: Object.freeze({ min: 0, max: 60 }),
    cardiacOutputLMin: Object.freeze({ min: 0.1, max: 30 }),
    weightKg: Object.freeze({ min: 1, max: 500 }),
    heightCm: Object.freeze({ min: 50, max: 250 }),
  });

  function isFiniteInRange(value, range) {
    return Number.isFinite(value) && value >= range.min && value <= range.max;
  }

  function parseLocalizedDecimal(rawValue) {
    if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : null;
    if (typeof rawValue !== 'string') return null;
    const normalized = rawValue.trim();
    if (normalized === '' || !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(normalized)) return null;
    const value = Number(normalized.replace(',', '.'));
    return Number.isFinite(value) ? value : null;
  }

  function calculateCaO2(hemoglobinGDl, saturationPercent, paO2MmHg) {
    if (!isFiniteInRange(hemoglobinGDl, LIMITS.hemoglobinGDl)) return null;
    if (!isFiniteInRange(saturationPercent, LIMITS.saturationPercent)) return null;
    if (!isFiniteInRange(paO2MmHg, LIMITS.paO2MmHg)) return null;

    const boundOxygenMlDl = CONSTANTS.hufnerMlO2PerGram * hemoglobinGDl * saturationPercent / 100;
    const dissolvedOxygenMlDl = CONSTANTS.dissolvedOxygenMlDlPerMmHg * paO2MmHg;
    return Object.freeze({
      totalMlDl: boundOxygenMlDl + dissolvedOxygenMlDl,
      boundOxygenMlDl,
      dissolvedOxygenMlDl,
    });
  }

  function validateReportedCaO2(caO2MlDl) {
    return isFiniteInRange(caO2MlDl, LIMITS.caO2MlDl) ? caO2MlDl : null;
  }

  function calculateBodySurfaceAreaMosteller(weightKg, heightCm) {
    if (!isFiniteInRange(weightKg, LIMITS.weightKg)) return null;
    if (!isFiniteInRange(heightCm, LIMITS.heightCm)) return null;
    return Math.sqrt(weightKg * heightCm / 3600);
  }

  function calculateCardiacIndex(cardiacOutputLMin, bodySurfaceAreaM2) {
    if (!isFiniteInRange(cardiacOutputLMin, LIMITS.cardiacOutputLMin)) return null;
    if (!Number.isFinite(bodySurfaceAreaM2) || bodySurfaceAreaM2 <= 0) return null;
    return cardiacOutputLMin / bodySurfaceAreaM2;
  }

  function calculateOxygenDelivery(caO2MlDl, cardiacOutputLMin) {
    if (validateReportedCaO2(caO2MlDl) === null) return null;
    if (!isFiniteInRange(cardiacOutputLMin, LIMITS.cardiacOutputLMin)) return null;
    return caO2MlDl * cardiacOutputLMin * CONSTANTS.decilitersPerLiter;
  }

  function calculateIndexedOxygenDelivery(caO2MlDl, cardiacIndexLMinM2) {
    if (validateReportedCaO2(caO2MlDl) === null) return null;
    if (!Number.isFinite(cardiacIndexLMinM2) || cardiacIndexLMinM2 <= 0) return null;
    return caO2MlDl * cardiacIndexLMinM2 * CONSTANTS.decilitersPerLiter;
  }

  function classifyCaO2(value) {
    if (validateReportedCaO2(value) === null) return null;
    if (value < 16) return Object.freeze({ key: 'below', label: 'Contenido arterial reducido' });
    if (value <= 22) return Object.freeze({ key: 'reference', label: 'Dentro de referencia orientativa' });
    return Object.freeze({ key: 'elevated', label: 'Contenido arterial elevado' });
  }

  function classifyCardiacIndex(value) {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value < 2.2) return Object.freeze({ key: 'markedly-low', label: 'Índice marcadamente reducido' });
    if (value < 2.5) return Object.freeze({ key: 'below', label: 'Por debajo de referencia' });
    if (value <= 4) return Object.freeze({ key: 'reference', label: 'Dentro de referencia orientativa' });
    return Object.freeze({ key: 'elevated', label: 'Patrón de flujo elevado' });
  }

  function classifyIndexedOxygenDelivery(value) {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value < 300) return Object.freeze({ key: 'markedly-low', label: 'Transporte marcadamente reducido' });
    if (value < 500) return Object.freeze({ key: 'below', label: 'Por debajo de referencia' });
    if (value <= 600) return Object.freeze({ key: 'reference', label: 'Dentro de referencia orientativa' });
    return Object.freeze({ key: 'elevated', label: 'Transporte indexado elevado' });
  }

  return Object.freeze({
    CONSTANTS,
    LIMITS,
    parseLocalizedDecimal,
    calculateCaO2,
    validateReportedCaO2,
    calculateBodySurfaceAreaMosteller,
    calculateCardiacIndex,
    calculateOxygenDelivery,
    calculateIndexedOxygenDelivery,
    classifyCaO2,
    classifyCardiacIndex,
    classifyIndexedOxygenDelivery,
  });
});
