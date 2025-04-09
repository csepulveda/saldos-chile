import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'

if (process.env.BCI_RUT === undefined) {
  throw new Error('Environment variable BCI_RUT is not set.')
}

if (process.env.BCI_PASS === undefined) {
  throw new Error('Environment variable BCI_PASS is not set.')
}


let launch_options = {
  headless: false
}

if (process.env.DOCKER === "true") {
  launch_options = {
    headless: true,
    executablePath: '/usr/bin/chromium',
    defaultViewport: { width: 1280, height: 800 },
  }
}


// Apply stealth
puppeteer.use(StealthPlugin())
puppeteer.launch(launch_options).then(async browser => {
  const page = await browser.newPage()
  await page.goto('https://www.bci.cl/personas')

  // Esperamos que este listo el boton de ingreso y luego hacemos click
  await page.waitForSelector('#intro-step2', {visible:true , timeout: 30000})
  await page.screenshot({ path: 'outputs/bci-home.png' })
  await page.click('#intro-step2')

  // Esperamos que cargue el formulario de login
  await page.waitForSelector('#rut_aux',{visible:true , timeout: 30000})
  await randomDelay(1000, 2000)
  await page.type('#rut_aux', process.env.BCI_RUT,{ delay: 200 })
  await randomDelay(1000, 2000)
  await page.type('#clave', process.env.BCI_PASS, { delay: 200 })
  await randomDelay(1000, 2000)
  await page.screenshot({ path: 'outputs/bci-pre-submit-login.png' })

  // Hacemos click en el boton de login
  await page.click('.text-center > .btn')

  // Esperamos que cargue el iframe del contenido de las cuentas
  await page.waitForSelector('iframe#iframeContenido', {visible:true , timeout: 30000})
  const iframeElement = await page.$('iframe#iframeContenido')
  const frame = await iframeElement.contentFrame()

  // Obtenemos el saldo disponible
  await page.screenshot({ path: 'outputs/bci-cuentas-pre-saldo.png' })
  await frame.waitForSelector('a[title="Saldo Disponible"]')
  const saldoElement = await frame.$('a[title="Saldo Disponible"]')
  const parent = await saldoElement.evaluateHandle(el => el.parentElement)
  const amountText = await parent.$eval('strong.destacado', el => el.textContent.trim())
  await page.screenshot({ path: 'outputs/bci-cuentas.png' })

  // Imprimimos el saldo en consola y lo guardamos en un archivo
  const amount = amountText.replace('$', '').replace(/\./g, '').replace(' ', '')
  console.log('Saldo BCI:', amount)
  fs.writeFileSync('outputs/bci-saldo.txt', amount)

  await browser.close()
})


const randomDelay = async (min = 3000, max = 5000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
}