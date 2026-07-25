(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DsiCalculations = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LIMITS = Object.freeze({
    heartRateBpm: Object.freeze({ min: 1, max: 300 }),
    diastolicPressureMmHg: Object.freeze({ min: 1, max: 200 }),
  });

  function isFiniteInRange(value, limits) {
    return Number.isFinite(value) && value >= limits.min && value <= limits.max;
  }

  function calculateDsi(heartRateBpm, diastolicPressureMmHg) {
    if (!isFiniteInRange(heartRateBpm, LIMITS.heartRateBpm)) return null;
    if (!isFiniteInRange(diastolicPressureMmHg, LIMITS.diastolicPressureMmHg)) return null;
    return heartRateBpm / diastolicPressureMmHg;
  }

  function calculateDsiTrend(baselineHeartRate, baselineDiastolicPressure, hour6HeartRate, hour6DiastolicPressure) {
    const baselineDsi = calculateDsi(baselineHeartRate, baselineDiastolicPressure);
    const hour6Dsi = calculateDsi(hour6HeartRate, hour6DiastolicPressure);
    if (baselineDsi === null || hour6Dsi === null) return null;

    const absoluteDelta = hour6Dsi - baselineDsi;
    const percentChange = absoluteDelta / baselineDsi * 100;
    const direction = Math.abs(absoluteDelta) < 1e-12
      ? 'unchanged'
      : absoluteDelta < 0 ? 'decrease' : 'increase';

    return Object.freeze({ baselineDsi, hour6Dsi, absoluteDelta, percentChange, direction });
  }

  return Object.freeze({ LIMITS, calculateDsi, calculateDsiTrend });
});
