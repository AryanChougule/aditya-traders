// Captures the live site in Marathi at phone size, for the phone shown inside the ads.
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SITE = "https://www.adityatraders.store";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
// the site keeps the language choice in localStorage
await page.evaluateOnNewDocument(() => localStorage.setItem("at-lang", "mr"));

async function shot(path, file, { fullPage = false, wait = 4500 } = {}) {
  await page.goto(SITE + path, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, wait)); // let the Diwali scene finish drawing
  await page.screenshot({ path: `shots/${file}`, fullPage, type: "jpeg", quality: 88 });
  console.log("saved", file);
}

await shot("/", "landing.jpg", { fullPage: true, wait: 6000 });
await shot("/categories", "categories.jpg", { wait: 2500 });
await browser.close();
