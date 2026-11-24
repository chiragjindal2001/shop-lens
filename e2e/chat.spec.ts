import { expect, test } from '@playwright/test';

// Runs against `LLM_PROVIDER=mock docker compose up` (LLM stubbed), at http://localhost:8080.
test('demo user: log in → ask about an order → streamed reply → reload → history', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try the demo account' }).click();
  await expect(page).toHaveURL(/\/chat/);

  await page.getByLabel('Message').fill('Where is my order SE1041?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Order SE1041 is shipped')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Past conversations' }).getByText('Where is my order SE1041?')).toBeVisible();
});
