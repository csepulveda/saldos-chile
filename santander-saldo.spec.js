import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'

if (process.env.SANTANDER_RUT === undefined) {
  throw new Error('Environment variable SANTANDER_RUT is not set.')
}

if (process.env.SANTANDER_PASS === undefined) {
  throw new Error('Environment variable SANTANDER_PASS is not set.')
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

  // User-Agent personalizado
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36')

  await page.goto('https://www.santander.cl/', {
    waitUntil: 'domcontentloaded',
  })

  // esperamos a que desaparezca el loader
  await page.waitForFunction(() => {
    const loader = document.querySelector('.bgLoader')
    return loader && window.getComputedStyle(loader).display === 'none'
  }, { timeout: 30000 })

  // Esperar y hacer clic en botón "Ingresar"
  await page.screenshot({ path: 'outputs/santander-home.png' })
  await page.waitForSelector('#btnIngresar', { visible: true, hidden: false, timeout: 30000 })
  await page.click('#btnIngresar')


  await page.screenshot({ path: 'outputs/santander-post-boton-ingresar.png' })
  // Esperar a que cargue el iframe del login para luego seguir con el login en si.
  await page.waitForSelector('iframe', { visible: true, timeout: 30000 })
  const loginFrame = await page.frames().find(frame => frame.url().includes('login-frame/ing/0010'))
  if (!loginFrame) {
    throw new Error('No se encontró el iframe del login.')
  }
  await loginFrame.waitForSelector('#iframe-login-box', { timeout: 30000 })
  await page.screenshot({ path: 'outputs/santander-login.png' })
  await loginFrame.type('#rut', process.env.SANTANDER_RUT, { delay: 100 })
  await loginFrame.type('#pass', process.env.SANTANDER_PASS, { delay: 100 })
  await randomDelay()
  await page.screenshot({ path: 'outputs/santander-pre-submit-login.png' })
  await loginFrame.click('button[type="submit"]')
  await randomDelay()
  

  // Esperar a que cargue el iframe de la cuenta
  await page.screenshot({ path: 'outputs/santander-pre-cuentas.png' })
  await page.waitForSelector('.box-product', { timeout: 30000 })

  // Obtenemos el monto de la primera cuenta corriente que encontramos.
  const cuentaCorrienteMonto = await page.evaluate(() => {
    // Buscar todos los bloques de producto
    const productos = document.querySelectorAll('.box-product')
    for (const producto of productos) {
      const titulo = producto.querySelector('.datos p')?.innerText.trim()
      if (titulo === 'Cuenta Corriente') {
        // Encuentra el monto disponible
        const monto = producto.querySelector('.monto1 .amount-pipe-4')?.innerText.trim()
        return monto
      }
    }
    return null // Si no encuentra
  })
  await page.screenshot({ path: 'outputs/santander-cuentas.png' })
  const amount = cuentaCorrienteMonto.replace('$', '').replace(/\./g, '').replace(' ', '')

  // Imprimimos el monto en consola y lo guardamos en un archivo.
  console.log('Saldo Santander:', amount)
  fs.writeFileSync('outputs/santander-saldo.txt', amount)

  await browser.close()
})

// Random delay helper
const randomDelay = async (min = 3000, max = 5000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  await new Promise(resolve => setTimeout(resolve, delay))
}