const { test, expect } = require('@playwright/test');

const UNLOCK_SLUG = 'aakrit-vaish';

async function waitForPeopleFilters(page) {
  await page.waitForFunction(() => {
    const trigger = document.querySelector('#ppl-dir-sidebar #filter-role .inv-dd-trigger');
    const options = document.querySelectorAll('#ppl-dir-sidebar #filter-role .inv-dd-option');
    return Boolean(trigger) && options.length > 2;
  });
}

async function waitForFundsFilters(page) {
  await page.waitForFunction(() => {
    const trigger = document.querySelector('#inv-dir-sidebar #filter-stage .inv-dd-trigger');
    const options = document.querySelectorAll('#inv-dir-sidebar #filter-stage .inv-dd-option');
    return Boolean(trigger) && options.length > 2;
  });
}

async function stubSignedIn(page) {
  await page.addInitScript(() => {
    document.cookie = 'vd_access_token=preview; Path=/; SameSite=Lax';
    try {
      localStorage.setItem(
        'sb-qviyhvnubhduyhgwzuzc-auth-token',
        JSON.stringify({
          access_token: 'preview',
          refresh_token: 'preview',
          expires_at: Math.floor(Date.now() / 1000) + 3600
        })
      );
    } catch (_) {}
  });
}

async function patchAuthAfterLoad(page) {
  await page.evaluate(() => {
    document.cookie = 'vd_access_token=preview; Path=/; SameSite=Lax';
    if (!window.VCAuth) return;
    window.VCAuth.hasStoredSession = function () {
      return true;
    };
    window.VCAuth.getSession = async function () {
      return { access_token: 'preview', user: { id: 'preview', email: 'preview@local' } };
    };
    window.VCAuth.authFetch = function (url, opts) {
      opts = opts || {};
      var headers = new Headers(opts.headers || {});
      headers.set('Authorization', 'Bearer preview');
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      return fetch(url, Object.assign({}, opts, { headers: headers }));
    };
  });
}

test.describe('directory golden paths', () => {
  test('investors: rows and filter dropdowns survive hydration', async ({ page }) => {
    await page.goto('/investors');
    await expect(page.locator('#ppl-results .inv-dir-row').first()).toBeVisible();
    await waitForPeopleFilters(page);
    const optionCount = await page.locator('#ppl-dir-sidebar #filter-role .inv-dd-option').count();
    expect(optionCount).toBeGreaterThan(2);
  });

  test('investors: applying a filter updates results in memory', async ({ page }) => {
    await page.goto('/investors');
    await waitForPeopleFilters(page);
    const before = await page.locator('#ppl-count').innerText();

    await page.locator('#ppl-dir-sidebar #filter-role .inv-dd-trigger').click();
    const choice = page.locator('#ppl-dir-sidebar #filter-role .inv-dd-option[data-value]:not([data-value=""])').first();
    await expect(choice).toBeVisible();
    await choice.click();

    await expect(page.locator('#ppl-results .inv-dir-skel')).toHaveCount(0);
    await expect(page.locator('#ppl-dir-sidebar #filter-role .inv-dd-trigger')).toBeVisible();
    const rowsOrEmpty = page.locator('#ppl-results .inv-dir-row, #ppl-results .inv-dir-empty-state');
    await expect(rowsOrEmpty.first()).toBeVisible();
    await expect(page.locator('#ppl-count')).not.toHaveText(before);
  });

  test('funds: filter dropdowns survive hydration', async ({ page }) => {
    await page.goto('/funds');
    await expect(page.locator('#inv-results .inv-dir-row').first()).toBeVisible();
    await waitForFundsFilters(page);
  });

  test('signed-in unlock reveals a mailto on the directory', async ({ page }) => {
    await stubSignedIn(page);
    await page.goto('/investors');
    await waitForPeopleFilters(page);
    await patchAuthAfterLoad(page);

    const unlock = page.locator(`#ppl-results [data-unlock-email][data-person-slug="${UNLOCK_SLUG}"]`).first();
    if ((await unlock.count()) === 0) test.skip();

    await unlock.click();
    const revealed = page.locator(
      `#ppl-results .inv-email-revealed[data-person-slug="${UNLOCK_SLUG}"] a[href^="mailto:"]`
    );
    await expect(revealed).toBeVisible({ timeout: 15000 });
    const href = await revealed.getAttribute('href');
    expect(href).toMatch(/^mailto:[^@]+@/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('login: OTP step appears after sending a mocked code', async ({ page }) => {
    await page.route('https://qviyhvnubhduyhgwzuzc.supabase.co/auth/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/otp')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      if (url.includes('/user')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ msg: 'No session' })
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/login');
    await expect(page.locator('#work-email')).toBeVisible();
    await page.locator('#work-email').fill('qa@vcdekho.com');
    await page.locator('#auth-submit-btn').click();
    await expect(page.locator('#otp-step')).toBeVisible();
    await expect(page.locator('#otp-code')).toBeVisible();
  });
});
