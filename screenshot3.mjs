import { chromium } from 'playwright';

const SCRATCHPAD = '/private/tmp/claude-501/-Users-giuly-Documents-Projects-bulk-wsp-sender/517e5525-58c5-41f7-9a46-6c945e48f4e0/scratchpad';
const EMAIL = 'screenshot1782827577362@test.com';
const PASS = 'TestPass123!';
const MSG = '¡Hola! 🎉\n\nTe traemos la mejor promo de julio. Aprovechá 30% de descuento en todos nuestros productos.\n\n¡No te lo pierdas!';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

await page.goto('http://localhost:3000/login');
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await Promise.all([
  page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await page.waitForTimeout(1000);

// Go to the Promo julio template
await page.goto('http://localhost:3000/templates/aOZ1aDCM5Ck9slWnSxDd');
await page.waitForTimeout(1500);

// Type via keyboard to trigger React onChange
const textarea = page.locator('textarea');
await textarea.click();
await page.keyboard.type(MSG);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SCRATCHPAD}/10-detail-live-preview.png`, fullPage: true });
console.log('Detail with live preview captured');

await browser.close();
