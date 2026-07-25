'use strict';

const assert = require('node:assert/strict');
const {
  calculateBmi,
  calculateReferenceWeight,
  calculateInfusionDose,
  normalizeDose,
  getNorepinephrineAbsoluteScale,
  getSofa2CardiovascularFromNorepinephrine,
} = require('../vasopresores-calculos.js');

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no coincide con ${expected}`);
}

closeTo(calculateBmi(90, 180), 27.7777777778, 1e-8);
closeTo(calculateBmi(108, 180), 33.3333333333, 1e-8);
assert.equal(calculateBmi(90, 0), null);
assert.equal(calculateBmi(10, 180), null);

closeTo(calculateReferenceWeight(180), 72.9);
assert.equal(calculateReferenceWeight(0), null);

const infusion = calculateInfusionDose(2, 4, 100, 8);
closeTo(infusion.concentrationMcgMl, 80);
closeTo(infusion.absoluteMcgMin, 10.6666666667, 1e-8);
closeTo(normalizeDose(infusion.absoluteMcgMin, 108), 0.0987654321, 1e-8);
closeTo(normalizeDose(infusion.absoluteMcgMin, 72.9), 0.1463191587, 1e-8);
closeTo(normalizeDose(20, 100), 0.20);
closeTo(normalizeDose(20, 80), 0.25);
closeTo(normalizeDose(20, 60), 0.3333333333, 1e-8);

closeTo(getNorepinephrineAbsoluteScale(20).positionPercent, 33.3333333333, 1e-8);
assert.equal(getNorepinephrineAbsoluteScale(60).positionPercent, 100);
assert.equal(getNorepinephrineAbsoluteScale(80).positionPercent, 100);
assert.equal(getNorepinephrineAbsoluteScale(80).beyondObservedRange, true);
assert.equal(getNorepinephrineAbsoluteScale(-1), null);

const sofaExample = getSofa2CardiovascularFromNorepinephrine(33, 94);
closeTo(sofaExample.doseMcgKgMin, 0.3510638298, 1e-8);
assert.equal(sofaExample.points, 3);
assert.equal(getSofa2CardiovascularFromNorepinephrine(18.8, 94).points, 2);
assert.equal(getSofa2CardiovascularFromNorepinephrine(37.6, 94).points, 3);
assert.equal(getSofa2CardiovascularFromNorepinephrine(37.61, 94).points, 4);
assert.equal(getSofa2CardiovascularFromNorepinephrine(33, null), null);

assert.equal(calculateInfusionDose(0, 4, 100, 8), null);
assert.equal(normalizeDose(10, 0), null);

console.log('OK: cálculos de vasopresores e IMC verificados.');
