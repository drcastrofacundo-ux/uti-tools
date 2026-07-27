(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AlbuminCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function isValidCrp(value) {
    return Number.isFinite(value) && value >= 0;
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
    isValidCrp,
    isValidAlbumin,
    calculateCrpAlbuminRatio,
    classifyCrpAlbuminRatio,
    calculateRatioTrend,
  });
});
