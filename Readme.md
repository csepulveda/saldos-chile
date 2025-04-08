# 💰 Saldos Chile

## 🧉 Introducción

Proyecto `just for fun` que permite obtener el **saldo de cuentas corrientes personales** de **BCI** y **Santander** (por ahora).  
Usa **Puppeteer** y se ejecuta desde una imagen basada en `node:lts`.

¿Para que estoy usando este proyecto?
Ejecuto mediante `cron` los saldos cada 6hrs y actualizo el valor en mi planilla de control de gastos de GoogleSheet.

---

## 🛠️ Generar la imagen Docker

```bash
docker build -t saldos-chile .
```

---

## 🤔 ¿Por qué Puppeteer y no Cypress u otros?

- **BCI** funciona perfecto con Cypress al igual que con Playwright.
- **Santander**, en cambio, bloquea casi cualquier framework de automatización (sí, son brígidos).  
  Lo único que me ha funcionado hasta ahora es **Puppeteer con el plugin `stealth`**.

---

## 🏦 Obtener saldo desde BCI

```bash
docker run -ti \
  -v $PWD/outputs:/app/outputs \
  -e BCI_RUT=xxxxxx \
  -e BCI_PASS=yyyyy \
  --cap-add=SYS_ADMIN \
  saldos-chile node bci-saldo.spec.js
```
*Es obligatorio el uso de `--cap-add=SYS_ADMIN`*

### 📤 Resultado

Te va a lanzar algo como:

```
Extracted amount: 123456
```

> El monto viene **sin signo peso ni puntos**, solo el número.

---

## 🏦 Obtener saldo desde Santander

```bash
docker run -ti \
  -v $PWD/outputs:/app/outputs \
  -e SANTANDER_RUT=xxxxxx \
  -e SANTANDER_PASS=yyyyy \
  --cap-add=SYS_ADMIN \
  saldos-chile node santander-saldo.spec.js
```
*Es obligatorio el uso de `--cap-add=SYS_ADMIN`*

### 📤 Resultado

```
Extracted amount: 752
```

Mismo formato que en BCI: **solamente el número**.

---

## 🧪 Correr en local

Si quieres probar el script sin Docker:

```bash
yarn install

SANTANDER_RUT=xxxxx SANTANDER_PASS=yyyyy node santander-saldo.spec.js
```

> En modo local se levanta el navegador.  
> En Mac, por ejemplo, abre Chrome automáticamente.

---

Si quieres aportar o agregar más bancos, feliz de recibir PRs.  
Esto es solo un experimento para entender cómo automatizar este tipo de cosas 🙃
