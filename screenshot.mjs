import { chromium } from 'playwright';

const SCRATCHPAD = '/private/tmp/claude-501/-Users-giuly-Documents-Projects-bulk-wsp-sender/517e5525-58c5-41f7-9a46-6c945e48f4e0/scratchpad';
const EMAIL = `screenshot${Date.now()}@test.com`;
const PASS = 'TestPass123!';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Register fresh account
await page.goto('http://localhost:3000/register');
await page.waitForTimeout(600);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('After register:', page.url());

// Login
await page.goto('http://localhost:3000/login');
await page.waitForTimeout(600);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await Promise.all([
  page.waitForNavigation({ timeout: 12000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await page.waitForTimeout(2000);
console.log('After login:', page.url());

if (page.url().includes('/login')) {
  const errText = await page.locator('text=/error|invalid/i').textContent().catch(() => 'no error text');
  console.log('Login failed, error:', errText);
  await page.screenshot({ path: `${SCRATCHPAD}/login-fail.png` });
  await browser.close();
  process.exit(1);
}

// Templates list (empty state)
await page.goto('http://localhost:3000/templates');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SCRATCHPAD}/03-templates-empty.png`, fullPage: true });
console.log('Templates empty captured');

// Click new template
await page.click('button:has-text("Nueva plantilla")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${SCRATCHPAD}/04-create-modal.png`, fullPage: true });

await browser.close();
console.log('Done');
