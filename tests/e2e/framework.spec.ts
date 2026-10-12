import { test, expect } from '@playwright/test';

test('SSR is readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('表示を');
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
  await context.close();
});
test('hydrates without a Flight fetch; navigation and history preserve client state', async ({ page }) => {
  const flightRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (request.headers().accept === 'text/x-component') flightRequests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  expect(flightRequests).toHaveLength(0);
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  await expect(page.getByTestId('location')).toHaveText('/about');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('表示を');
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  expect(flightRequests.length).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});
test('explicit POST followed by refresh updates RSC while keeping state', async ({ page }) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await page.getByLabel('新しいメモ').fill('E2E で API 更新を検証');
  await page.getByRole('button', { name: '追加する' }).click();
  await expect(page.getByRole('link', { name: 'E2E で API 更新を検証' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  await page.getByRole('link', { name: 'E2E で API 更新を検証' }).click();
  await expect(page.getByTestId('context')).toContainText('/notes/2 / id=2');
});
test('HTTP variants, HEAD, 404 and forbidden page mutations', async ({ request }) => {
  const html = await request.get('/');
  expect(html.headers()['content-type']).toContain('text/html');
  expect(html.headers().vary).toContain('Accept');
  expect(html.headers()['cache-control']).toBe('private, no-store');
  const flight = await request.get('/', { headers: { Accept: 'text/x-component' } });
  expect(flight.headers()['content-type']).toContain('text/x-component');
  expect(await flight.text()).not.toContain('<!DOCTYPE');
  expect((await request.head('/')).status()).toBe(200);
  expect((await request.get('/missing')).status()).toBe(404);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const response = await request.fetch('/notes', { method, headers: { 'Next-Action': 'arbitrary' }, data: 'not-a-flight-payload' });
    expect(response.status()).toBe(405);
    expect(response.headers().allow).toBe('GET, HEAD');
  }
});
test('concurrent streaming requests retain their own URL and params', async ({ request }) => {
  const results = await Promise.all(['a', 'b', 'c'].map(id => request.get(`/slow/${id}?ms=30`, { headers: { Accept: 'text/x-component' } }).then(r => r.text())));
  results.forEach((body, i) => {
    expect(body).toContain(`/slow/${['a', 'b', 'c'][i]}`);
    expect(body).not.toContain(`/slow/${['b', 'c', 'a'][i]}`);
  });
});
test('newer navigation wins over delayed older response', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await page.route('**/slow/old*', async route => { await new Promise(r => setTimeout(r, 300)); await route.continue().catch(() => {}); });
  await page.evaluate(() => { void navigation.navigate('/slow/old?ms=200').finished?.catch(() => {}); });
  await page.waitForTimeout(30);
  await page.evaluate(() => { void navigation.navigate('/about').finished; });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
  await page.waitForTimeout(600);
  await expect(page.getByTestId('location')).toHaveText('/about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
});
test('redirect falls back to the destination document', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await page.evaluate(() => { void navigation.navigate('/old-about').finished?.catch(() => {}); });
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
});
test('unknown Flight URL displays a 404 page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await page.evaluate(() => { void navigation.navigate('/not-found').finished; });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('404');
});
test('static hosting serves HTML and Flight without the RSC server', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4174/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  const response = page.waitForResponse('**/about/index.rsc');
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  const flight = await response;
  expect(flight.status()).toBe(200);
  expect(flight.headers()['content-type']).toContain('text/x-component');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Navigation API unavailable falls back to document navigation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'navigation', { value: undefined }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
  await expect(page.getByRole('button', { name: 'Client count: 0' })).toBeVisible();
});

test('failed Flight fetch shows a recovery link at the destination URL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Client count: 0' }).click();
  await expect(page.getByRole('button', { name: 'Client count: 1' })).toBeVisible();
  await page.route('**/about', route => route.abort());
  await page.getByRole('link', { name: 'Design', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ページを表示できませんでした');
  await expect(page).toHaveURL(/\/about$/);
  await page.unroute('**/about');
  await page.getByRole('link', { name: '再読み込み' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('責務を小さく。');
});
