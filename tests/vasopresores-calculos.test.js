'use strict';

const assert = require('node:assert/strict');
const {
  calculateBmi,
  calculateReferenceWeight,
  calculatePredictedBodyWeight,
  calculateInfusionDose,
  calculateRateFromDose,
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

// ---------------------------------------------------------------------------
// Peso predicho de Devine
// Convive con el peso de referencia de Peterson, no lo reemplaza: Peterson es
// el denominador transparente para noradrenalina, Devine es el peso con el que
// MIRA dosifica midazolam y UTI Ronda indexa el volumen corriente. Son dos
// números distintos con dos propósitos distintos, y ninguno sustituye al otro.
// ---------------------------------------------------------------------------

closeTo(calculatePredictedBodyWeight(180, 'male'), 50 + 0.91 * (180 - 152.4));
closeTo(calculatePredictedBodyWeight(180, 'female'), 45.5 + 0.91 * (180 - 152.4));
closeTo(calculatePredictedBodyWeight(165, 'female'), 45.5 + 0.91 * (165 - 152.4));
assert.equal(calculatePredictedBodyWeight(180, ''), null, 'sin sexo no hay peso predicho');
assert.equal(calculatePredictedBodyWeight(180, 'otro'), null);
assert.equal(calculatePredictedBodyWeight(0, 'male'), null);
assert.equal(calculatePredictedBodyWeight(115, 'male'), null, 'Devine daría menos de 20 kg');

// Los dos pesos difieren, y por eso hay que mostrarlos con nombres distintos
assert.notEqual(calculatePredictedBodyWeight(165, 'female'), calculateReferenceWeight(165));

// El mismo número que devuelve UTI Ronda para la paciente de 165 cm
closeTo(calculatePredictedBodyWeight(165, 'female'), 56.966, 1e-3);

// ---------------------------------------------------------------------------
// Cálculo inverso: de la dosis objetivo a la velocidad de bomba
// ---------------------------------------------------------------------------

// Ida y vuelta: la velocidad que sale del inverso tiene que reproducir la dosis
const prep = calculateInfusionDose(4, 4, 100, 15);   // 160 mcg/mL
closeTo(prep.concentrationMcgMl, 160);
const dosisObjetivo = normalizeDose(prep.absoluteMcgMin, 80);
const vuelta = calculateRateFromDose({
  doseValue: dosisObjetivo, concentrationMcgMl: prep.concentrationMcgMl,
  weightKg: 80, perKg: true, perMinute: true,
});
closeTo(vuelta.rateMlH, 15, 1e-9);

// Caso de mano: noradrenalina 0,1 mcg/kg/min en 80 kg con 160 mcg/mL
// 0,1 * 80 * 60 = 480 mcg/h -> 480 / 160 = 3 mL/h
closeTo(calculateRateFromDose({ doseValue: 0.1, concentrationMcgMl: 160, weightKg: 80, perKg: true, perMinute: true }).rateMlH, 3);

// Dosis por hora y por kg (dexmedetomidina): 0,3 mcg/kg/h en 80 kg con 4 mcg/mL
// 0,3 * 80 = 24 mcg/h -> 24 / 4 = 6 mL/h
closeTo(calculateRateFromDose({ doseValue: 0.3, concentrationMcgMl: 4, weightKg: 80, perKg: true, perMinute: false }).rateMlH, 6);

// Dosis absoluta, sin peso (vasopresina y similares): 20 mcg/min con 100 mcg/mL
closeTo(calculateRateFromDose({ doseValue: 20, concentrationMcgMl: 100, perKg: false, perMinute: true }).rateMlH, 12);

// Dosis cero es válida y da velocidad cero
closeTo(calculateRateFromDose({ doseValue: 0, concentrationMcgMl: 160, weightKg: 80, perKg: true, perMinute: true }).rateMlH, 0);

// Avisa cuando la velocidad se va del rango de una bomba
assert.equal(calculateRateFromDose({ doseValue: 0.1, concentrationMcgMl: 160, weightKg: 80, perKg: true, perMinute: true }).beyondPumpRange, false);
assert.equal(calculateRateFromDose({ doseValue: 5, concentrationMcgMl: 1, weightKg: 80, perKg: true, perMinute: true }).beyondPumpRange, true);

// Entradas inválidas
assert.equal(calculateRateFromDose({ doseValue: -1, concentrationMcgMl: 160, weightKg: 80, perKg: true, perMinute: true }), null);
assert.equal(calculateRateFromDose({ doseValue: 0.1, concentrationMcgMl: 0, weightKg: 80, perKg: true, perMinute: true }), null);
assert.equal(calculateRateFromDose({ doseValue: 0.1, concentrationMcgMl: 160, perKg: true, perMinute: true }), null, 'por kg sin peso no se puede');
assert.equal(calculateRateFromDose({ doseValue: 0.1, concentrationMcgMl: 160, weightKg: 5, perKg: true, perMinute: true }), null);

console.log('OK: cálculos de vasopresores e IMC verificados.');
console.log('OK: peso predicho de Devine, separado del peso de referencia de Peterson, verificado.');
