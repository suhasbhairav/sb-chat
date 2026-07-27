import { mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const APP_URL = process.env.BATUK_CAPTURE_URL || "http://localhost:3000";
const OUT_DIR = "tmp/readme-gif";
const DEMO_EMAIL = "batuk-demo-gif@example.com";
const DEMO_PASSWORD = "BatukDemo123!";
const CHROME_EXECUTABLE_PATH = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const execFileAsync = promisify(execFile);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_EXECUTABLE_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 820 },
    deviceScaleFactor: 1,
  });

  async function screenshot(name) {
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
  }

  await page.goto(APP_URL, { waitUntil: "networkidle" });

  if (await page.getByRole("button", { name: "Sign in", exact: true }).count()) {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const inputs = page.locator("input");
    await inputs.nth(0).fill(DEMO_EMAIL);
    await inputs.nth(1).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in to Batuk", exact: true }).click();
    await page.waitForTimeout(2500);
  }

  await screenshot("frame-01-chat");

  await page.getByRole("button", { name: "Open documents" }).click();
  await screenshot("frame-02-documents");
  await page.locator('button[title="Close documents"]').click();

  await page.getByRole("button", { name: "Open menu" }).click();
  await screenshot("frame-03-menu");

  await page.getByRole("button", { name: "API access" }).click();
  await screenshot("frame-04-api-access");

  await page.getByRole("button", { name: "Back to menu" }).click();
  await page.getByRole("button", { name: "Token usage" }).click();
  await screenshot("frame-05-token-usage");

  await page.getByRole("button", { name: "Back to menu" }).click();
  if (await page.getByRole("button", { name: "Workspace management" }).count()) {
    await page.getByRole("button", { name: "Workspace management" }).click();
    await screenshot("frame-06-workspace-management");
  }

  await browser.close();
  await execFileAsync("magick", [
    `${OUT_DIR}/frame-01-chat.png`,
    `${OUT_DIR}/frame-02-documents.png`,
    `${OUT_DIR}/frame-03-menu.png`,
    `${OUT_DIR}/frame-04-api-access.png`,
    `${OUT_DIR}/frame-05-token-usage.png`,
    "-resize",
    "960x",
    "-delay",
    "600",
    "-loop",
    "0",
    "-layers",
    "Optimize",
    "public/batuk-demo.gif",
  ]);
  console.log(`Captured README GIF frames in ${OUT_DIR}`);
  console.log("Wrote public/batuk-demo.gif");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
