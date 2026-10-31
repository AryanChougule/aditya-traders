// Renders ads/ad.html to MP4 (frame by frame, so timing is exact) and grabs poster stills.
//   node render.mjs reel|story|feed [--stills 1.2,8,28] [--fps 30]
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const fmt = process.argv[2] ?? "reel";
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const fps = Number(arg("--fps", 30));
const stills = arg("--stills", "");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars"] });
const page = await browser.newPage();
const url = pathToFileURL(new URL("./ads/ad.html", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")).href + `?f=${fmt}`;
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0" });
const info = await page.evaluate(() => window.adReady);
await page.setViewport({ width: info.W, height: info.H, deviceScaleFactor: 1 });
await page.evaluate(() => window.seek(0));

if (stills) {
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: `out/${fmt}-${String(t).replace(".", "_")}s.jpg`, type: "jpeg", quality: 90 });
    console.log("still", t);
  }
  await browser.close();
  process.exit(0);
}

const out = `out/aditya-traders-diwali-${fmt}.mp4`;
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(fps), out], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(info.dur * fps);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.seek(t), i / fps);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 90 === 0) console.log(`${fmt}: frame ${i}/${frames}`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("wrote", out);
