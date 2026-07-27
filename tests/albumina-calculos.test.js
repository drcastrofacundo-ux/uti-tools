'use strict';

const assert = require('node:assert/strict');
const {
  isValidCrp,
  isValidAlbumin,
  calculateCrpAlbuminRatio,
  classifyCrpAlbuminRatio,
  calculateRatioTrend,
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

console.log('OK: cociente PCR/albúmina, validación y tendencia serial verificados.');
