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
