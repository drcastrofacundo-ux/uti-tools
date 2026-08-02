'use strict';

const assert = require('node:assert/strict');
const {
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
} = require('../oxigeno-calculos.js');

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no coincide con ${expected}`);
}

assert.equal(parseLocalizedDecimal('7'), 7);
assert.equal(parseLocalizedDecimal('15,2'), 15.2);
assert.equal(parseLocalizedDecimal('15.2'), 15.2);
assert.equal(parseLocalizedDecimal(' 0,31 '), 0.31);
assert.equal(parseLocalizedDecimal(''), null);
assert.equal(parseLocalizedDecimal('1,2,3'), null);
assert.equal(parseLocalizedDecimal('12abc'), null);
assert.equal(parseLocalizedDecimal('1e3'), null);

const content = calculateCaO2(15, 98, 100);
closeTo(content.boundOxygenMlDl, 19.698);
closeTo(content.dissolvedOxygenMlDl, 0.31);
closeTo(content.totalMlDl, 20.008);
assert.equal(calculateCaO2(15, 101, 100), null);
assert.equal(calculateCaO2(-1, 98, 100), null);
assert.equal(validateReportedCaO2(20), 20);
assert.equal(validateReportedCaO2(61), null);

const bsa = calculateBodySurfaceAreaMosteller(70, 170);
closeTo(bsa, Math.sqrt(70 * 170 / 3600));
assert.equal(calculateBodySurfaceAreaMosteller(0, 170), null);

const cardiacIndex = calculateCardiacIndex(5, bsa);
closeTo(cardiacIndex, 5 / bsa);
closeTo(calculateOxygenDelivery(content.totalMlDl, 5), 1000.4);
closeTo(calculateIndexedOxygenDelivery(content.totalMlDl, cardiacIndex), content.totalMlDl * cardiacIndex * 10);
assert.equal(calculateCardiacIndex(0.09, bsa), null);
assert.equal(calculateOxygenDelivery(61, 5), null);
assert.equal(calculateIndexedOxygenDelivery(20, 0), null);

assert.equal(classifyCaO2(15.9).key, 'below');
assert.equal(classifyCaO2(16).key, 'reference');
assert.equal(classifyCaO2(22).key, 'reference');
assert.equal(classifyCaO2(22.1).key, 'elevated');
assert.equal(classifyCardiacIndex(2.19).key, 'markedly-low');
assert.equal(classifyCardiacIndex(2.2).key, 'below');
assert.equal(classifyCardiacIndex(2.5).key, 'reference');
assert.equal(classifyCardiacIndex(4.1).key, 'elevated');
assert.equal(classifyIndexedOxygenDelivery(299).key, 'markedly-low');
assert.equal(classifyIndexedOxygenDelivery(300).key, 'below');
assert.equal(classifyIndexedOxygenDelivery(500).key, 'reference');
assert.equal(classifyIndexedOxygenDelivery(601).key, 'elevated');
assert.equal(classifyCaO2(61), null);
assert.equal(classifyCardiacIndex(0), null);
assert.equal(classifyIndexedOxygenDelivery(0), null);

console.log('OK: CaO₂, SC, IC, DO₂, DO₂I, validación y referencias verificados.');
