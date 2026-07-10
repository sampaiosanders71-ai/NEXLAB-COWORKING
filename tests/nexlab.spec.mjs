import { test, expect } from '@playwright/test';

test('shell, manifesto e diagnóstico carregam sem erro fatal', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/NEXLAB/i);
  await expect(page.locator('meta[name="nexlab-version"]')).toHaveAttribute('content', '26.7');
  await page.waitForTimeout(1200);
  expect(pageErrors).toEqual([]);

  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const manifestJson = await manifest.json();
  expect(manifestJson.name).toBe('NEXLAB');
  expect(manifestJson.icons.length).toBeGreaterThanOrEqual(4);

  const worker = await page.request.get('/nexlab-sw.js');
  expect(worker.ok()).toBeTruthy();
  expect(await worker.text()).toContain('nexlab-v26-6-shell-r1');
});

test('página de homologação executa testes somente leitura', async ({ page }) => {
  await page.goto('/homologacao.html', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /NEXLAB v26\.7/i })).toBeVisible();
  await page.getByRole('button', { name: 'Executar testes técnicos' }).click();
  await expect(page.locator('.result')).toHaveCount(6);
  await expect(page.locator('.result.fail')).toHaveCount(0);
});

test('layout móvel não provoca transbordamento geral', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Teste exclusivo do projeto móvel.');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(3);
});

test('login autenticado opcional e navegação básica', async ({ page }) => {
  const email = process.env.NEXLAB_TEST_EMAIL;
  const password = process.env.NEXLAB_TEST_PASSWORD;
  test.skip(!email || !password, 'Credenciais de homologação não configuradas.');

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /entrar|acessar/i }).first().click();
  await expect(page.locator('header')).toBeVisible({ timeout: 20_000 });

  const snapshot = await page.evaluate(() => window.__NEXLAB_TEST_API__?.snapshot?.());
  expect(snapshot?.version).toBe('26.7');
  expect(snapshot?.accessibility?.unnamedVisibleButtons).toBe(0);
});

test('prontidão final e release estão disponíveis', async ({ page }) => {
  await page.goto('/prontidao.html', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /NEXLAB v26\.7/i })).toBeVisible();

  const releaseResponse = await page.request.get('/release.json');
  expect(releaseResponse.ok()).toBeTruthy();
  const release = await releaseResponse.json();
  expect(release.version).toBe('26.7');
  expect(release.channel).toBe('stable');
});
