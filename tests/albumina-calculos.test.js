'use strict';

const assert = require('node:assert/strict');
const {
  isValidCrp,
  isValidAlbumin,
  calculateCrpAlbuminRatio,
  classifyCrpAlbuminRatio,
  calculateRatioTrend,
  CANONICAL_CRP_UNIT,
  CRP_UNITS,
  normalizeCrp,
  convertCrpToMgDl,
} = require('../albumina-calculos.js');

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no coincide con ${expected}`);
}

assert.equal(isValidCrp(0), true);
assert.equal(isValidCrp(-1), false);
assert.equal(isValidAlbumin(0), false);
assert.equal(isValidAlbumin(3.5), true);

closeTo(calculateCrpAlbuminRatio(120, 3), 40);
assert.equal(calculateCrpAlbuminRatio(-1, 3), null);
assert.equal(calculateCrpAlbuminRatio(120, 0), null);

assert.equal(classifyCrpAlbuminRatio(-1), null);
assert.equal(classifyCrpAlbuminRatio(25).key, 'historical-reference');
assert.equal(classifyCrpAlbuminRatio(25.1).key, 'elevated');
assert.equal(classifyCrpAlbuminRatio(60.9).key, 'elevated');
assert.equal(classifyCrpAlbuminRatio(61).key, 'published-threshold');
assert.equal(classifyCrpAlbuminRatio(73.9).key, 'published-threshold');
assert.equal(classifyCrpAlbuminRatio(74).key, 'higher-published-range');
assert.equal(classifyCrpAlbuminRatio(86).key, 'higher-published-range');

const increase = calculateRatioTrend(60, 3, 120, 3);
closeTo(increase.previousRatio, 20);
closeTo(increase.currentRatio, 40);
closeTo(increase.absoluteDelta, 20);
closeTo(increase.percentChange, 100);
assert.equal(increase.direction, 'increase');

const zeroBaseline = calculateRatioTrend(0, 3, 30, 3);
assert.equal(zeroBaseline.percentChange, null);
assert.equal(zeroBaseline.direction, 'increase');
assert.equal(calculateRatioTrend(60, 3, 120, 0), null);

// ---------------------------------------------------------------------------
// Unidades de PCR
// El cociente se calcula en mg/L. MIRA espera mg/dL. Cargar el mismo valor de
// laboratorio en las dos herramientas produce un error de diez veces, así que
// la unidad viaja explícita con el número y la conversión es una sola función.
// ---------------------------------------------------------------------------

assert.equal(CANONICAL_CRP_UNIT, 'mg/L');
assert.deepEqual(CRP_UNITS, ['mg/L', 'mg/dL']);

closeTo(normalizeCrp(120, 'mg/L'), 120);
closeTo(normalizeCrp(12, 'mg/dL'), 120, 1e-12);
closeTo(normalizeCrp(0, 'mg/dL'), 0);
assert.equal(normalizeCrp(120, 'ng/mL'), null, 'unidad no soportada');
assert.equal(normalizeCrp(120, ''), null, 'la unidad es obligatoria');
assert.equal(normalizeCrp(-1, 'mg/L'), null);
assert.equal(normalizeCrp('x', 'mg/L'), null);

closeTo(convertCrpToMgDl(120), 12);
closeTo(convertCrpToMgDl(0), 0);
assert.equal(convertCrpToMgDl(-1), null);

// El mismo laboratorio en las dos unidades tiene que dar el mismo cociente
closeTo(
  calculateCrpAlbuminRatio(normalizeCrp(180, 'mg/L'), 2.4),
  calculateCrpAlbuminRatio(normalizeCrp(18, 'mg/dL'), 2.4),
  1e-12,
);

// Y el valor que hay que copiar a MIRA es el mismo por los dos caminos
closeTo(convertCrpToMgDl(normalizeCrp(180, 'mg/L')), 18);
closeTo(convertCrpToMgDl(normalizeCrp(18, 'mg/dL')), 18);

console.log('OK: cociente PCR/albúmina, validación y tendencia serial verificados.');
console.log('OK: unidades de PCR normalizadas y conversión a mg/dL para MIRA verificadas.');
