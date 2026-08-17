'use strict';

const assert = require('node:assert/strict');
const {
  calculateInfusion, calculateRateForTargetDose, classifyReferencePosition, buildClinicalAssessment,
  calculateFirstTaperStep, durationToHours, calculateEgfrCkdEpi2021,
} = require('../opioides-calculos.js');

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no coincide con ${expected}`);
}

const fentanyl = calculateInfusion({ drugKey:'fentanyl', ampoules:10,
  volumeMl:250, rateMlH:5, weightKg:70, durationValue:4, durationUnit:'days' });
closeTo(fentanyl.concentration, 20);
closeTo(fentanyl.absoluteRate, 100);
closeTo(fentanyl.normalizedRate, 100 / 70);
closeTo(fentanyl.cumulativeValue, 9600);
assert.equal(fentanyl.cumulativeUnit, 'µg');
assert.equal(classifyReferencePosition('fentanyl', fentanyl).key, 'within');

const morphine = calculateInfusion({ drugKey:'morphine', ampoules:10,
  volumeMl:100, rateMlH:2, weightKg:80, durationValue:48, durationUnit:'hours' });
closeTo(morphine.absoluteRate, 2);
closeTo(morphine.cumulativeValue, 96);
assert.equal(classifyReferencePosition('morphine', morphine).key, 'within');
assert.ok(buildClinicalAssessment({ weightKg:80, heightCm:170, ageYears:70, creatinineMgDl:3.2, sex:'male',
  renalStatus:'stable', hepatic:'none', chronicOpioid:false, concurrentBenzodiazepine:false }, morphine).flags.some(x => x.includes('M3G/M6G')));
const akiKrtAssessment = buildClinicalAssessment({ weightKg:80, heightCm:170, ageYears:70, creatinineMgDl:3.2,
  sex:'male', renalStatus:'aki-ihd', hepatic:'none', chronicOpioid:false, concurrentBenzodiazepine:false }, morphine);
assert.equal(akiKrtAssessment.egfr, null);
assert.equal(akiKrtAssessment.onKrt, true);
assert.ok(akiKrtAssessment.flags.some(x => x.includes('puede recuperar función')));
assert.ok(akiKrtAssessment.cautions.some(x => x.includes('M3G/M6G')));
assert.equal(Math.round(calculateEgfrCkdEpi2021(1.5, 90, 'male')), 44);
assert.equal(Math.round(calculateEgfrCkdEpi2021(1.5, 90, 'female')), 33);
assert.equal(calculateEgfrCkdEpi2021(1.5, 70, null), null);

const remi = calculateInfusion({ drugKey:'remifentanil', ampoules:2,
  volumeMl:100, rateMlH:6, weightKg:60, durationValue:72, durationUnit:'hours' });
closeTo(remi.absoluteRate, 10);
closeTo(remi.normalizedRate, 1 / 6);
closeTo(remi.cumulativeValue, 43.2);
assert.equal(classifyReferencePosition('remifentanil', remi).key, 'within');

const dex = calculateInfusion({ drugKey:'dexmedetomidine', ampoules:2,
  volumeMl:100, rateMlH:10, weightKg:80, durationValue:12, durationUnit:'hours' });
closeTo(dex.normalizedRate, 0.5);
assert.equal(classifyReferencePosition('dexmedetomidine', dex).key, 'within');

assert.equal(durationToHours(4, 'days'), 96);
assert.equal(durationToHours(0, 'hours'), null);
closeTo(calculateFirstTaperStep(5, 10).exampleRateMlH, 4.5);
assert.equal(calculateFirstTaperStep(0, 10), null);
assert.equal(calculateInfusion({ drugKey:'fentanyl', ampoules:0,
  volumeMl:250, rateMlH:5, weightKg:70, durationValue:1, durationUnit:'days' }), null);

// ---------------------------------------------------------------------------
// De la dosis objetivo a la velocidad de bomba
// Cada droga en su propia unidad de referencia: morfina en mg/h absolutos,
// fentanilo y dexmedetomidina en µg/kg/h, remifentanilo en µg/kg/min.
// ---------------------------------------------------------------------------

const prepFentanyl = { drugKey:'fentanyl', ampoules:10, volumeMl:250, weightKg:70 };
const objetivoFentanyl = calculateRateForTargetDose({ ...prepFentanyl, targetDose:1.5 });
assert.equal(objetivoFentanyl.targetUnit, 'µg/kg/h');
// 1,5 µg/kg/h * 70 kg = 105 µg/h ; concentración 5000/250 = 20 µg/mL -> 5,25 mL/h
closeTo(objetivoFentanyl.rateMlH, 5.25);
assert.equal(objetivoFentanyl.withinReference, true);

// Ida y vuelta contra el cálculo directo
const vueltaFentanyl = calculateInfusion({ ...prepFentanyl, rateMlH: objetivoFentanyl.rateMlH, durationValue:1, durationUnit:'hours' });
closeTo(vueltaFentanyl.normalizedRate, 1.5, 1e-9);

// Dexmedetomidina: 0,3 µg/kg/h en 70 kg, 1 ampolla de 200 µg en 50 mL = 4 µg/mL
const objetivoDex = calculateRateForTargetDose({ drugKey:'dexmedetomidine', ampoules:1, volumeMl:50, weightKg:70, targetDose:0.3 });
assert.equal(objetivoDex.targetUnit, 'µg/kg/h');
closeTo(objetivoDex.rateMlH, 5.25);   // 0,3*70 = 21 µg/h / 4 µg/mL
assert.equal(objetivoDex.withinReference, true);
const vueltaDex = calculateInfusion({ drugKey:'dexmedetomidine', ampoules:1, volumeMl:50, weightKg:70, rateMlH: objetivoDex.rateMlH, durationValue:1, durationUnit:'hours' });
closeTo(vueltaDex.normalizedRate, 0.3, 1e-9);

// Y avisa cuando la dosis pedida queda fuera del rango citado
assert.equal(calculateRateForTargetDose({ drugKey:'dexmedetomidine', ampoules:1, volumeMl:50, weightKg:70, targetDose:3 }).withinReference, false);

// Remifentanilo va en µg/kg/min y la ampolla en mg: la conversión no se puede saltear
const objetivoRemi = calculateRateForTargetDose({ drugKey:'remifentanil', ampoules:2, volumeMl:100, weightKg:70, targetDose:0.1 });
assert.equal(objetivoRemi.targetUnit, 'µg/kg/min');
// 0,1*70 = 7 µg/min -> 0,42 mg/h ; concentración 10 mg/100 mL = 0,1 mg/mL -> 4,2 mL/h
closeTo(objetivoRemi.rateMlH, 4.2, 1e-9);
const vueltaRemi = calculateInfusion({ drugKey:'remifentanil', ampoules:2, volumeMl:100, weightKg:70, rateMlH: objetivoRemi.rateMlH, durationValue:1, durationUnit:'hours' });
closeTo(vueltaRemi.normalizedRate, 0.1, 1e-9);

// Morfina se pide en dosis absoluta: no necesita peso
const objetivoMorfina = calculateRateForTargetDose({ drugKey:'morphine', ampoules:5, volumeMl:50, targetDose:4 });
assert.equal(objetivoMorfina.targetUnit, 'mg/h');
closeTo(objetivoMorfina.rateMlH, 4);   // 50 mg / 50 mL = 1 mg/mL

assert.equal(calculateRateForTargetDose({ drugKey:'fentanyl', ampoules:10, volumeMl:250, targetDose:1.5 }), null, 'por kg sin peso no se puede');
assert.equal(calculateRateForTargetDose({ drugKey:'fentanyl', ampoules:0, volumeMl:250, weightKg:70, targetDose:1.5 }), null);
assert.equal(calculateRateForTargetDose({ drugKey:'nada', ampoules:10, volumeMl:250, weightKg:70, targetDose:1.5 }), null);
assert.equal(calculateRateForTargetDose({ drugKey:'fentanyl', ampoules:10, volumeMl:250, weightKg:70, targetDose:-1 }), null);

console.log('OK: cálculos de opioides, exposición y primer paso verificados.');
console.log('OK: dosis objetivo a velocidad de bomba, en la unidad de cada droga, verificado.');
