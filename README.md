# UTI Tools

Aplicación clínica estática para GitHub Pages.

## Uso local

Serví la carpeta con un servidor HTTP local y abrí `index.html` en un navegador moderno.

## Verificación de cálculos

La lógica pura de IMC, peso ideal estimado y dosis de infusión está en `vasopresores-calculos.js`.

```powershell
node .\tests\vasopresores-calculos.test.js
```

En la calculadora de noradrenalina, el peso ideal estimado usa una referencia antropométrica explícita (`22,5 kg/m² × talla²`), basada en la selección de un IMC objetivo descripta por Peterson et al. (*Am J Clin Nutr* 2016; DOI 10.3945/ajcn.115.121178). Se muestran por separado la dosis absoluta en `µg/min`, la dosis normalizada por peso real y la normalizada por ese peso ideal estimado. El selector de denominador documenta la lectura elegida pero no modifica la bomba ni automatiza la titulación.

Fundamento clínico: Wendel-García et al., *Anesthesiology* 2026 (PMID 42090639; DOI 10.1097/ALN.0000000000006134). El estudio comparó dosis absoluta con dosis normalizada por peso de ingreso y no validó el peso ideal como denominador alternativo.

La escala de exposición absoluta es continua y descriptiva: no usa categorías ni cortes de dosis. El tramo visual de `0–60 µg/min` refleja el rango en el que Sacha et al. (*Crit Care Med* 2022; PMID 34582425; DOI 10.1097/CCM.0000000000005317) observaron 20,7% mayores odds de mortalidad por cada incremento de `10 µg/min` de dosis equivalente de noradrenalina al iniciar vasopresina. Es evidencia observacional, no causal, no define dosis alta, no es un gatillo terapéutico y no reemplaza tendencia, perfusión ni fenotipo hemodinámico.

El asistente SOFA-2 cardiovascular calcula `µg/kg/min` exclusivamente con peso real y muestra la equivalencia por noradrenalina sola: 2 puntos para `≤0,2`, 3 puntos para `>0,2–0,4` y 4 puntos para `>0,4 µg/kg/min` (Ranzani et al., *JAMA* 2025; DOI 10.1001/jama.2025.20516). No usa peso ideal ni ajustado y no puede asignar puntos a partir de `µg/min` sin un peso real válido. Si hay adrenalina, otros vasoactivos/inotrópicos o soporte mecánico, debe completarse el selector cardiovascular integral.

## DSI serial

`dsi.html` permite documentar FC y PAD a hora 0 y 6 horas. La lógica pura en `dsi-calculos.js` calcula DSI basal, DSI 6 h, `ΔDSI = DSI₆h − DSI₀` y cambio porcentual. La lectura se limita a ascenso, descenso o ausencia de cambio respecto del basal, sin cortes de gravedad ni indicaciones terapéuticas. Fuente: Sarkar et al., *Indian J Crit Care Med* 2026;30(2):99–106 (PMID 41868080; DOI 10.5005/jp-journals-10071-25130), estudio prospectivo observacional con mediciones a 0, 6, 12 y 24 h.

```powershell
node .\tests\dsi-calculos.test.js
```

## PCR / albúmina en sepsis adulta

`albumina.html` conserva el cálculo `PCR (mg/L) ÷ albúmina (g/dL)` y permite una comparación serial opcional con fecha y hora. La lógica pura y su validación están en `albumina-calculos.js`. El resultado no usa bandas de gravedad, no diagnostica fuga capilar y no dispara decisiones sobre cristaloides o albúmina.

La pantalla separa evidencia fisiopatológica observacional de evidencia terapéutica: Seldén et al. (*Critical Care* 2025; PMID 40057738), Wiedermann et al. (2025; PMID 40806877), ARISS (*JAMA Network Open* 2026; DOI 10.1001/jamanetworkopen.2025.59297) y recomendaciones SSC 2026.

```powershell
node .\tests\albumina-calculos.test.js
```

## Transporte de oxígeno

`oxigeno.html` permite usar el CaO₂ informado por gases arteriales o calcularlo desde Hb (`g/dL`), SaO₂ (`%`) y PaO₂ (`mmHg`). Con gasto cardíaco ecográfico (`L/min`), peso real (`kg`) y talla (`cm`) calcula superficie corporal por Mosteller, índice cardíaco, DO₂ absoluto y DO₂I.

Las tarjetas cromáticas expresan referencias fisiológicas adultas orientativas y no gatillos terapéuticos. Se conservan en paralelo los valores absolutos e indexados; en obesidad no se sustituye automáticamente el peso real ni se oculta el gasto cardíaco absoluto.

```powershell
node .\tests\oxigeno-calculos.test.js
```

## Opioides en infusión continua

`opioides.html` calcula concentración, dosis absoluta, dosis normalizada por peso real y cantidad acumulada administrada para morfina, fentanilo y remifentanilo. Dexmedetomidina se presenta por separado como coadyuvante no opioide. La lógica pura está en `opioides-calculos.js`.

Las presentaciones quedan fijas para disminuir carga y errores de unidad: morfina 10 mg/1 mL, fentanilo 500 µg/ampolla, remifentanilo 5 mg/ampolla y dexmedetomidina 200 µg/ampolla. El usuario carga cantidad de ampollas, volumen total preparado y velocidad de bomba.

La dosis se compara con rangos de infusión publicados sin convertirlos en categorías de toxicidad ni indicaciones de titulación. La persistencia se contextualiza por droga, duración y función orgánica; la cantidad acumulada no se presenta como concentración plasmática.

Si se consignan creatinina (`mg/dL`), edad y sexo, la pantalla estima TFGe con CKD-EPI 2021 sin coeficiente de raza. Se advierte que esta estimación supone creatinina relativamente estable y puede ser engañosa durante una injuria renal aguda en evolución.

La situación renal distingue función estable, IRA sin reemplazo, IRA con hemodiálisis intermitente, IRA con CKRT, IRA con modalidad prolongada/SLED y hemodiálisis crónica. CKD-EPI se anula en IRA o reemplazo renal; la IRA con diálisis se presenta como potencialmente reversible y no como enfermedad renal terminal.

El módulo de destete sólo aparece a pedido. Un descenso inicial del 10% se muestra como escalón orientativo de reevaluación, no como pauta terapéutica validada. Actualmente no existe una escala ni un protocolo universal de abstinencia iatrogénica para adultos críticos.

```powershell
node .\tests\opioides-calculos.test.js
```
