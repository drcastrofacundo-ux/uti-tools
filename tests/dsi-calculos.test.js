'use strict';

const assert = require('node:assert/strict');
const { calculateDsi, calculateDsiTrend } = require('../dsi-calculos.js');

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no coincide con ${expected}`);
}

closeTo(calculateDsi(120, 60), 2);
assert.equal(calculateDsi(90, 0), null);
assert.equal(calculateDsi(301, 60), null);

const decrease = calculateDsiTrend(120, 60, 100, 60);
closeTo(decrease.baselineDsi, 2);
closeTo(decrease.hour6Dsi, 1.6666666667, 1e-8);
closeTo(decrease.absoluteDelta, -0.3333333333, 1e-8);
closeTo(decrease.percentChange, -16.6666666667, 1e-8);
assert.equal(decrease.direction, 'decrease');

const increase = calculateDsiTrend(90, 60, 110, 55);
closeTo(increase.absoluteDelta, 0.5);
closeTo(increase.percentChange, 33.3333333333, 1e-8);
assert.equal(increase.direction, 'increase');

const unchanged = calculateDsiTrend(100, 50, 100, 50);
assert.equal(unchanged.absoluteDelta, 0);
assert.equal(unchanged.percentChange, 0);
assert.equal(unchanged.direction, 'unchanged');

assert.equal(calculateDsiTrend(120, 60, null, 60), null);

console.log('OK: DSI basal, DSI 6 h y cambios seriales verificados.');
