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
console.log('Launching browser with options:', launch_options)

puppeteer.launch(launch_options).then(async browser => {
  const page = await browser.newPage()

  // User-Agent personalizado
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36')

  await page.goto('https://www.santander.cl/', {
    waitUntil: 'domcontentloaded',
  })

  await randomDelay()
  // Esperar y hacer clic en botón "Ingresar"
  await page.screenshot({ path: 'outputs/santander-home.png' })
  await page.waitForSelector('#btnIngresar', { visible: true })
  await page.screenshot({ path: 'outputs/santander-post-boton-ingresar.png' })
  await randomDelay()
  await page.click('#btnIngresar')
  await randomDelay()

  // Esperar a que cargue el iframe del login
  await page.waitForSelector('iframe', { timeout: 15000 })

  // Cambiar el contexto al iframe
  const loginFrame = await page.frames().find(frame => frame.url().includes('login-frame/ing/0010'))
  if (!loginFrame) {
    throw new Error('No se encontró el iframe del login.')
  }

  await randomDelay()

  // Esperar a que cargue el contenedor del login (formulario) dentro del iframe
  await loginFrame.waitForSelector('#iframe-login-box', { timeout: 15000 })
  await page.screenshot({ path: 'outputs/santander-login.png' })
  // Escribir RUT (asegúrate de que esté bien formateado)
  await loginFrame.type('#rut', process.env.SANTANDER_RUT, { delay: 100 })
  await loginFrame.type('#pass', process.env.SANTANDER_PASS, { delay: 100 })
  await randomDelay()

  await page.screenshot({ path: 'outputs/santander-pre-submit-login.png' })
  // Click en botón Ingresar
  await loginFrame.click('button[type="submit"]')
  await randomDelay()
  
  await page.screenshot({ path: 'outputs/santander-pre-cuentas.png' })
  await page.waitForSelector('.box-product', { timeout: 20000 }) // espera que cargue la vista de cuentas

  
  await randomDelay()
  // Extraer el monto de la Cuenta Corriente
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
  const amount = cuentaCorrienteMonto.replace('$', '').replace(/\./g, '')
  console.log('Extracted amount:', amount)
  fs.writeFileSync('outputs/santander-saldo.txt', amount)

  await browser.close()
})

// Random delay helper
const randomDelay = async (min = 3000, max = 5000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  await new Promise(resolve => setTimeout(resolve, delay))
}