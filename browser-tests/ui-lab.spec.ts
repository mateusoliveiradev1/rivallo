import { expect, test } from '@playwright/test';

const developmentUrl = 'http://127.0.0.1:4173/__ui-lab';
const productionUrl = 'http://127.0.0.1:4174/__ui-lab';

test('renders deterministic UI Lab evidence at the configured desktop viewport', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);

  await expect(page.getByRole('heading', { name: 'UI Lab Rivallo' })).toBeVisible();
  await expect(page.getByText('Evidência de layout, não emulação de dispositivo.')).toBeVisible();
  expect(
    await page.evaluate(() => [document.documentElement.clientWidth, window.innerHeight]),
  ).toEqual([testInfo.project.use.viewport?.width, testInfo.project.use.viewport?.height]);

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

test('keeps DenseTable width finite and reaches both horizontal edges', async ({ page }) => {
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'DenseTable' }).click();
  await page.getByRole('combobox', { name: 'Estado da tabela' }).selectOption('ready');
  await page.getByRole('combobox', { name: 'Prioridade de colunas' }).selectOption('3');

  const scrollArea = page.getByRole('region', { name: 'Tabela densa configurável' });
  const table = page.getByRole('table', { name: 'DenseTable de evidência' });
  const firstHeader = table.getByRole('columnheader').filter({
    has: page.getByRole('button', { name: 'Ordenar por Exemplo' }),
  });
  const firstIdentifier = table.getByLabel(
    'Exemplo Ágata do Norte com nome deliberadamente extenso para localização',
  );
  const actionsHeader = table.getByRole('columnheader', { name: 'Ações' });
  const primaryAction = table.getByRole('button', { name: 'Abrir evidência' }).first();

  await expect(scrollArea).toBeVisible();
  await expect(table).toBeVisible();
  await expect(scrollArea.getByText('Use a rolagem para acessar todo o conteúdo.')).toBeVisible();

  const geometry = await scrollArea.evaluate((region) => {
    const denseTable = region.querySelector('table');
    if (!denseTable) throw new Error('DenseTable missing from its labelled ScrollArea.');

    const declaredColumnWidth = [...denseTable.querySelectorAll('col')].reduce((total, column) => {
      if (column.classList.contains('rv-dense-table__selection-column')) return total + 56;
      if (column.classList.contains('rv-dense-table__actions-column')) return total + 220;
      const width = Number.parseFloat(column.style.width);
      if (!Number.isFinite(width) || width <= 0) {
        throw new Error('DenseTable data columns require finite positive inline widths.');
      }
      return total + width;
    }, 0);
    const availableInlineSize = Math.min(region.getBoundingClientRect().width, window.innerWidth);
    const tolerance = 4;

    return {
      clientWidth: region.clientWidth,
      scrollWidth: region.scrollWidth,
      tableWidth: denseTable.getBoundingClientRect().width,
      declaredColumnWidth,
      maximumExpectedWidth: Math.max(declaredColumnWidth, availableInlineSize) + tolerance,
    };
  });

  expect(Object.values(geometry).every((measurement) => Number.isFinite(measurement))).toBe(true);
  expect(geometry.clientWidth).toBeGreaterThan(0);
  expect(geometry.scrollWidth).toBeGreaterThan(0);
  expect(geometry.tableWidth).toBeGreaterThan(0);
  expect(geometry.declaredColumnWidth).toBe(1_432);
  expect(geometry.clientWidth).toBeLessThanOrEqual(geometry.maximumExpectedWidth);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.maximumExpectedWidth);
  expect(geometry.tableWidth).toBeLessThanOrEqual(geometry.maximumExpectedWidth);
  expect(geometry.scrollWidth).toBeGreaterThanOrEqual(geometry.clientWidth);

  const isVisibleAtTheInlineEdge = async (locator: typeof firstHeader) =>
    locator.evaluate((element) => {
      const region = element.closest<HTMLElement>('.rv-scroll-area');
      if (!region) return false;
      const bounds = element.getBoundingClientRect();
      const regionBounds = region.getBoundingClientRect();
      const visibleLeft = Math.max(0, regionBounds.left);
      const visibleRight = Math.min(window.innerWidth, regionBounds.right);
      const tolerance = 1;
      return bounds.left >= visibleLeft - tolerance && bounds.right <= visibleRight + tolerance;
    });

  await scrollArea.evaluate((region) => {
    region.scrollLeft = 0;
  });
  expect(await isVisibleAtTheInlineEdge(firstHeader)).toBe(true);
  expect(await isVisibleAtTheInlineEdge(firstIdentifier)).toBe(true);

  await scrollArea.evaluate((region) => {
    region.scrollLeft = region.scrollWidth - region.clientWidth;
  });
  expect(await isVisibleAtTheInlineEdge(actionsHeader)).toBe(true);
  expect(await isVisibleAtTheInlineEdge(primaryAction)).toBe(true);
  await primaryAction.focus();
  await expect(primaryAction).toBeFocused();
  await primaryAction.click();

  const density = page.getByRole('combobox', { name: 'Densidade da tabela' });
  await density.selectOption('compact');
  expect(
    await table.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(12);
  await density.selectOption('comfortable');
  expect(
    await table.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(14);
});

test('keeps the icon review cells optically bounded at the target viewport', async ({
  page,
}, testInfo) => {
  await page.goto(developmentUrl);
  await page.getByRole('button', { name: 'Icons' }).click();

  await expect(page.locator('[data-navigation-reference]')).toHaveCount(4);
  await expect(page.locator('[data-football-review]')).toHaveCount(3);
  await expect(page.locator('[data-extension-case]')).toHaveCount(4);

  const reviewCells = page.locator('[data-icon-review-cell]');
  await expect(reviewCells).toHaveCount(36);
  for (let index = 0; index < (await reviewCells.count()); index += 1) {
    const cell = reviewCells.nth(index);
    await cell.scrollIntoViewIfNeeded();
    await expect(cell).toBeVisible();
  }
  expect(
    await reviewCells.evaluateAll((cells) =>
      cells.flatMap((cell) => {
        const cellBounds = cell.getBoundingClientRect();
        const svg = cell.querySelector('svg');
        if (!svg) return ['missing-svg'];
        const svgBounds = svg.getBoundingClientRect();
        const tolerance = 0.5;
        return svgBounds.left + tolerance >= cellBounds.left &&
          svgBounds.top + tolerance >= cellBounds.top &&
          svgBounds.right - tolerance <= cellBounds.right &&
          svgBounds.bottom - tolerance <= cellBounds.bottom
          ? []
          : [cell.getAttribute('data-icon-review-cell') ?? 'unnamed-cell'];
      }),
    ),
  ).toEqual([]);

  await page.locator('.ui-lab__preview-scroll').evaluate((element) => {
    element.scrollLeft = 0;
  });

  await page.screenshot({
    path: testInfo.outputPath(`icon-review-${testInfo.project.name}.png`),
    fullPage: true,
  });
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

test('keeps long text, non-colour status, and reduced-motion evidence reachable', async ({
  page,
}) => {
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
  expect(await longText.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );

  expect(
    await page.getByTestId('reduced-motion-proof').evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(',')
        .every((duration) => Number.parseFloat(duration) <= 0.000_01),
    ),
  ).toBe(true);
});

test('keeps the hidden Lab absent from the production build', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-1920x1080',
    'One production-boundary proof is enough.',
  );

  await page.goto(productionUrl);
  await expect(page.getByRole('heading', { name: 'UI Lab Rivallo' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Categorias do UI Lab' })).toHaveCount(0);
});
