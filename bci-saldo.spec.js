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
console.log('Launching browser with options:', launch_options)

puppeteer.launch(launch_options).then(async browser => {
  const page = await browser.newPage()
  await page.goto('https://www.bci.cl/personas')

  await page.waitForSelector('#intro-step2')
  await page.screenshot({ path: 'outputs/bci-home.png' })
  await randomDelay()
  await page.click('#intro-step2')
  await randomDelay()

  await page.waitForSelector('#rut_aux')
  await randomDelay()
  await page.type('#rut_aux', process.env.BCI_RUT,{ delay: 100 })
  await randomDelay()
  await page.type('#clave', process.env.BCI_PASS, { delay: 100 })
  await randomDelay()
  await page.screenshot({ path: 'outputs/bci-pre-submit-login.png' })
  await page.click('.text-center > .btn')
  await randomDelay()

  await page.screenshot({ path: 'outputs/bci-post-submit-login.png' })
  await page.waitForSelector('iframe#iframeContenido', { timeout: 15000 })
  const iframeElement = await page.$('iframe#iframeContenido')
  const frame = await iframeElement.contentFrame()

  await page.screenshot({ path: 'outputs/bci-cuentas-pre-saldo.png' })
  await frame.waitForSelector('a[title="Saldo Disponible"]')
  const saldoElement = await frame.$('a[title="Saldo Disponible"]')
  const parent = await saldoElement.evaluateHandle(el => el.parentElement)
  const amountText = await parent.$eval('strong.destacado', el => el.textContent.trim())

  await page.screenshot({ path: 'outputs/bci-cuentas.png' })
  const amount = amountText.replace('$', '').replace(/\./g, '')
  console.log('Extracted amount:', amount)
  fs.writeFileSync('outputs/bci-saldo.txt', amount)

  await browser.close()
})


const randomDelay = async (min = 3000, max = 5000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
}