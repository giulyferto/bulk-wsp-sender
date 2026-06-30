import { chromium } from 'playwright';

const SCRATCHPAD = '/private/tmp/claude-501/-Users-giuly-Documents-Projects-bulk-wsp-sender/517e5525-58c5-41f7-9a46-6c945e48f4e0/scratchpad';
// Use the account we just made
const EMAIL = 'screenshot1782827577362@test.com';
const PASS = 'TestPass123!';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Login
await page.goto('http://localhost:3000/login');
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await Promise.all([
  page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
  page.click('button[type="submit"]'),
]);
await page.waitForTimeout(1500);
console.log('Logged in:', page.url());

// Create 2 templates via API to see the list
const cookies = await page.context().cookies();
const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

// Create template 1 via UI
await page.goto('http://localhost:3000/templates');
await page.waitForTimeout(1000);
await page.click('button:has-text("Nueva plantilla")');
await page.waitForTimeout(300);
await page.fill('input[placeholder="Ej: Promo julio"]', 'Promo julio 🎉');
await page.click('button:has-text("Crear y editar")');
await page.waitForURL('**/templates/**', { timeout: 8000 });
await page.waitForTimeout(1500);
console.log('On template detail:', page.url());

// Screenshot the detail page (empty body)
await page.screenshot({ path: `${SCRATCHPAD}/05-template-detail-empty.png`, fullPage: true });
console.log('Detail (empty) captured');

// Type a message body
const textarea = page.locator('textarea');
await textarea.fill('¡Hola {{nombre}}! 🎉\n\nTe traemos la mejor promo de julio. Aprovechá un 30% de descuento en todos nuestros productos.\n\nVálido hasta el 31/07. ¡No te lo pierdas!');
await page.waitForTimeout(800);
await page.screenshot({ path: `${SCRATCHPAD}/06-template-detail-with-message.png`, fullPage: true });
console.log('Detail with message captured');

// Save body
await page.click('button:has-text("Guardar")');
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SCRATCHPAD}/07-template-detail-saved.png`, fullPage: true });
console.log('Detail saved captured');

// Go back to list
await page.click('a:has-text("Plantillas")');
await page.waitForURL('**/templates', { timeout: 5000 });
await page.waitForTimeout(1000);

// Create second template
await page.click('button:has-text("Nueva plantilla")');
await page.waitForTimeout(300);
await page.fill('input[placeholder="Ej: Promo julio"]', 'Bienvenida');
await page.click('button:has-text("Crear y editar")');
await page.waitForURL('**/templates/**', { timeout: 8000 });
await page.waitForTimeout(800);
await page.goto('http://localhost:3000/templates');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SCRATCHPAD}/08-templates-list-with-items.png`, fullPage: true });
console.log('Templates list with items captured');

// Select one template to see preview
await page.click('text=Promo julio 🎉');
await page.waitForTimeout(800);
await page.screenshot({ path: `${SCRATCHPAD}/09-templates-list-selected.png`, fullPage: true });
console.log('Templates list with selection captured');

await browser.close();
console.log('All done!');
