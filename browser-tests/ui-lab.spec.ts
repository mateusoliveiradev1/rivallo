import { expect, test } from '@playwright/test';

const developmentUrl = 'http://127.0.0.1:4173/__ui-lab';
const productionUrl = 'http://127.0.0.1:4174/__ui-lab';

test('renders deterministic UI Lab evidence at the configured desktop viewport', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await expect(page.getByRole('heading', { name: 'UI Lab Rivallo' })).toBeVisible();
  await expect(page.getByText('Evidência de layout, não emulação de dispositivo.')).toBeVisible();
  expect(await page.evaluate(() => [document.documentElement.clientWidth, window.innerHeight])).toEqual([
    testInfo.project.use.viewport?.width,
    testInfo.project.use.viewport?.height,
  ]);

  await page.screenshot({ path: testInfo.outputPath('ui-lab.png'), fullPage: true });
});

test('supports keyboard DenseTable controls and preserves shell-toggle focus', async ({ page }) => {
  await page.goto(developmentUrl);

  await page.getByRole('button', { name: 'DenseTable' }).click();
  await page.getByRole('combobox', { name: 'Densidade da tabela' }).selectOption('comfortable');
  await expect(page.getByRole('table', { name: 'DenseTable de evidência' })).toHaveAttribute(
    'data-density',
    'comfortable',
  );

  const sort = page.getByRole('button', { name: 'Ordenar por Exemplo' });
  await sort.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('columnheader', { name: /Exemplo/u })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );

  const firstRow = page.getByRole('checkbox', { name: /Selecionar Exemplo Ágata/u });
  await firstRow.check();
  await expect(page.getByText('1 linha selecionada')).toBeVisible();

  await page.getByRole('button', { name: 'Shell proof' }).click();
  const toggle = page.getByRole('button', { name: 'Recolher navegação' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  const expandedToggle = page.getByRole('button', { name: 'Expandir navegação' });
  await expect(expandedToggle).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Composição de navegação' })).toHaveAttribute(
    'data-navigation-width',
    '56',
  );
});

test('contains modal focus and returns it to the invoker', async ({ page }) => {
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Primitives' }).click();

  const trigger = page.getByRole('button', { name: 'Abrir diálogo' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Diálogo de evidência' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(':focus')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('keeps long text, non-colour status, and reduced-motion evidence reachable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 683, height: 768 });
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Accessibility evidence' }).click();

  const status = page.getByRole('status');
  await expect(status).toContainText(
    'Informação acompanhada por ícone e texto; a cor não é o único sinal.',
  );
  await expect(status.locator('svg')).toHaveCount(1);

  const longText = page.getByTestId('long-text-proof');
  await expect(longText).toBeVisible();
  await expect(longText).toHaveCSS('font-size', '28px');
  expect(await longText.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  expect(
    await page.getByTestId('reduced-motion-proof').evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(',')
        .every((duration) => Number.parseFloat(duration) <= 0.000_01),
    ),
  ).toBe(true);
});

test('keeps the hidden Lab absent from the production build', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1920x1080', 'One production-boundary proof is enough.');

  await page.goto(productionUrl);
  await expect(page.getByRole('heading', { name: 'UI Lab Rivallo' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Categorias do UI Lab' })).toHaveCount(0);
});
