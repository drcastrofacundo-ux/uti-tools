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
