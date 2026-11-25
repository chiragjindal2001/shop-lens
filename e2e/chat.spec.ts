import { expect, test } from '@playwright/test';

// Runs against `LLM_PROVIDER=mock docker compose up` (LLM stubbed), at http://localhost:8080.
test('demo user: log in → home with orders → ask the assistant → reload → history', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try the demo account' }).click();

  // Home page: the storefront on the left, the assistant docked on the right.
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Your recent orders' })).toBeVisible();
  await expect(page.locator('#orders').getByText('SE1041')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Shoplens assistant' })).toBeVisible();

  // Ask in the assistant panel and get a streamed answer; the conversation id lands in the URL.
  await page.getByLabel('Message').fill('Where is my order SE1041?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Order SE1041 is shipped')).toBeVisible();
  await expect(page).toHaveURL(/\?chat=/);

  // Reload: the conversation is restored from the URL, and it is listed in History.
  await page.reload();
  await expect(page.getByText('Order SE1041 is shipped')).toBeVisible();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('navigation', { name: 'Past conversations' }).getByText('Where is my order SE1041?')).toBeVisible();
});

test('the order buttons ask the assistant', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try the demo account' }).click();
  await page.locator('#orders').getByRole('button', { name: 'Track' }).first().click();
  await expect(page.getByRole('log', { name: 'Conversation' })).toContainText('Where is my order');
});
