import { expect, test, type Page, type TestInfo } from '@playwright/test';
import path from 'node:path';

const editorUrl = 'http://127.0.0.1:4173/data-editor';
const mainMenuUrl = 'http://127.0.0.1:4173/main-menu';
const evidenceRoot = process.env.CREATOR_STUDIO_UAT_EVIDENCE;

test.use({ actionTimeout: 10_000 });

const screenshot = async (page: Page, testInfo: TestInfo, name: string) => {
  const destination = evidenceRoot
    ? path.join(evidenceRoot, `${name}.png`)
    : testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: destination, fullPage: true });
};

const waitForDraftSaved = async (page: Page) => {
  const state = page.locator('.data-editor-draft-state');
  await expect(state).toHaveText('Alterações pendentes');
  await expect(state).toHaveText('Salvo', { timeout: 10_000 });
};

const readPersistedUatClub = async (page: Page) =>
  page.evaluate(() => {
    const state = (
      window as unknown as {
        __CREATOR_STUDIO_UAT__: {
          readState: () => { projects: Array<{ source: { patchesJson: string | null } }> };
        };
      }
    ).__CREATOR_STUDIO_UAT__.readState();
    const patchesJson = state.projects.at(-1)?.source.patchesJson;
    const patches = patchesJson
      ? (JSON.parse(patchesJson) as Array<{
          entityKind?: string;
          entity?: { value?: { name?: string; competitionId?: string; historySummary?: string } };
        }>)
      : [];
    return patches
      .filter(
        (patch) =>
          patch.entityKind === 'club' && patch.entity?.value?.name === 'Aurora Futebol Clube',
      )
      .at(-1)?.entity?.value;
  });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const storageKey = 'rivallo.creator-studio.automated-uat';
    type StoredProject = {
      projectId: string;
      name: string;
      mode: 'dataStudio' | 'quickMod';
      status: 'draft' | 'modified' | 'exported';
      basePackageId: string;
      packageId: string;
      version: string;
      updatedAt: number;
      lastExportedAt: number | null;
      entityCount: number;
      schemaVersion: number;
      createdAt: number;
      revision: number;
      source: {
        manifestJson: string;
        worldJson: string | null;
        patchesJson: string | null;
        assets: readonly unknown[];
      };
    };
    type State = {
      projects: StoredProject[];
      installed: boolean;
      exports: string[];
      invocations: string[];
    };
    const readState = (): State => {
      const value = window.localStorage.getItem(storageKey);
      return value
        ? (JSON.parse(value) as State)
        : { projects: [], installed: false, exports: [], invocations: [] };
    };
    const writeState = (state: State) =>
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    const clone = <T>(value: T): T => structuredClone(value);
    const baseManifest = {
      packageId: 'official.rivallo.foundation',
      name: 'Base oficial Rivallo',
      version: '1.0.0',
      schemaVersion: 1,
      gameVersionCompatibility: '>=0.1.0 <0.2.0',
      author: 'Rivallo',
      description: 'Base oficial isolada do UAT',
      contentType: 'base',
      visibility: 'public',
      checksum: 'sha256:creator-studio-uat-base',
      dependencies: [],
      conflicts: [],
      assets: [],
      entrypoints: { world: 'data/world.json', patches: null },
    };
    type IdRecord = { id: string; [key: string]: unknown };
    type ProfileRecord = {
      identity: { entityId: string; [key: string]: unknown };
      [key: string]: unknown;
    };
    type NationRecord = { id: string; name: string; iso2: string; iso3: string };
    const foundationClub: IdRecord = {
      id: 'uat.foundation.club',
      name: 'Clube Fundação UAT',
      shortName: 'UAT',
      city: 'Cidade Base',
      nationId: 'nation.brazil',
      primaryColor: '#143d31',
      secondaryColor: '#f5f0df',
    };
    const world: {
      clubs: IdRecord[];
      nations: NationRecord[];
      regions: IdRecord[];
      cities: IdRecord[];
      stadiums: IdRecord[];
      competitions: IdRecord[];
      matchday: { club: IdRecord; players: IdRecord[] };
      profiles: { players: ProfileRecord[]; coaches: ProfileRecord[] };
    } = {
      clubs: [foundationClub],
      nations: [{ id: 'nation.brazil', name: 'Brasil', iso2: 'BR', iso3: 'BRA' }],
      regions: [],
      cities: [],
      stadiums: [],
      competitions: [],
      matchday: { club: foundationClub, players: [] },
      profiles: { players: [], coaches: [] },
    };
    const catalog = [
      {
        manifest: baseManifest,
        active: true,
        validation: { valid: true, diagnostics: [] },
        catalogScope: 'public',
        selectable: true,
      },
    ];
    const resolvedWorld = () => {
      const next = clone(world) as typeof world & {
        assets?: unknown[];
      };
      const project = readState().projects.at(-1);
      const patches = project?.source.patchesJson
        ? (JSON.parse(project.source.patchesJson) as Array<{
            operation: string;
            entityKind: string;
            targetId: string;
            entity?: { value?: Record<string, unknown> } | null;
          }>)
        : [];
      const upsert = <T extends { id: string }>(items: T[], value: T) => [
        ...items.filter((item) => item.id !== value.id),
        value,
      ];
      for (const patch of patches) {
        const value = patch.entity?.value;
        if (!value || patch.operation === 'remove') continue;
        if (patch.entityKind === 'club') {
          next.clubs = upsert(next.clubs, value as (typeof next.clubs)[number]);
        }
        if (patch.entityKind === 'competition') {
          next.competitions = upsert(
            next.competitions,
            value as (typeof next.competitions)[number],
          );
        }
        if (patch.entityKind === 'matchdayPlayer') {
          next.matchday.players = upsert(
            next.matchday.players,
            value as (typeof next.matchday.players)[number],
          );
        }
        if (patch.entityKind === 'playerProfile') {
          const profile = value as (typeof next.profiles.players)[number];
          next.profiles.players = [
            ...next.profiles.players.filter(
              (item) => item.identity.entityId !== profile.identity.entityId,
            ),
            profile,
          ];
        }
        if (patch.entityKind === 'externalPlayer' && value.profile) {
          const profile = value.profile as (typeof next.profiles.players)[number];
          next.profiles.players = [
            ...next.profiles.players.filter(
              (item) => item.identity.entityId !== profile.identity.entityId,
            ),
            profile,
          ];
        }
        if (patch.entityKind === 'coach') {
          const coach = value as (typeof next.profiles.coaches)[number];
          next.profiles.coaches = [
            ...next.profiles.coaches.filter(
              (item) => item.identity.entityId !== coach.identity.entityId,
            ),
            coach,
          ];
        }
      }
      next.assets = project?.source.assets.map((asset) => ({
        ...(asset as Record<string, unknown>),
        checksum: 'sha256:creator-studio-uat-asset',
        privateUse: false,
        sourcePackageId: project.packageId,
        runtimeSource: String((asset as { path?: string }).path ?? ''),
      }));
      return next;
    };
    const summary = (project: StoredProject) => {
      const {
        projectId,
        name,
        mode,
        status,
        basePackageId,
        packageId,
        version,
        updatedAt,
        lastExportedAt,
        entityCount,
      } = project;
      return {
        projectId,
        name,
        mode,
        status,
        basePackageId,
        packageId,
        version,
        updatedAt,
        lastExportedAt,
        entityCount,
      };
    };
    const bridge = {
      convertFileSrc: (filePath: string) =>
        filePath.includes('clubCrest')
          ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
          : filePath,
      invoke: async (command: string, args: Record<string, unknown> = {}) => {
        const state = readState();
        state.invocations.push(command);
        writeState(state);
        if (command === 'lifecycle_status' || command === 'retry_lifecycle') {
          return { state: 'ready', ownership: 'owned' };
        }
        if (command === 'data_package_catalog') {
          if (!state.installed) return clone(catalog);
          const installedProject = state.projects.at(-1);
          const installedManifest = installedProject
            ? (JSON.parse(installedProject.source.manifestJson) as typeof baseManifest)
            : baseManifest;
          return clone([
            ...catalog,
            {
              manifest: { ...installedManifest, contentType: 'mod' },
              active: false,
              validation: { valid: true, diagnostics: [] },
              catalogScope: 'public',
              selectable: false,
            },
          ]);
        }
        if (command === 'world_database_status') {
          return {
            schemaVersion: 1,
            packages: [clone(baseManifest)],
            fingerprint: { algorithm: 'sha256', value: 'creator-studio-uat-world' },
          };
        }
        if (command === 'preview_career_composition') {
          const composedWorld = resolvedWorld();
          const selectedPackages = [
            clone(baseManifest),
            ...(state.installed && state.projects.at(-1)
              ? [JSON.parse(state.projects.at(-1)!.source.manifestJson) as typeof baseManifest]
              : []),
          ];
          return {
            schemaVersion: 1,
            packages: selectedPackages,
            fingerprint: {
              algorithm: 'sha256',
              value: 'creator-studio-uat-world',
              schemaVersion: 1,
              packageOrder: selectedPackages.map((item) => item.packageId),
            },
            coverage: {
              clubs: composedWorld.clubs.length,
              players: composedWorld.matchday.players.length,
              coaches: composedWorld.profiles.coaches.length,
              nations: composedWorld.nations.length,
              competitions: composedWorld.competitions.length,
              assets: composedWorld.assets?.length ?? 0,
            },
            validation: { valid: true, diagnostics: [] },
            world: composedWorld,
          };
        }
        if (
          command === 'world_reference_catalog' ||
          command === 'world_reference_catalog_for_selection'
        ) {
          const composedWorld = resolvedWorld();
          return {
            assets: composedWorld.assets ?? [],
            nations: composedWorld.nations.map((nation) => ({
              ...nation,
              aliases: [nation.iso2, nation.iso3],
              confederationId: null,
              flagAssetId: null,
              externalIds: [],
            })),
          };
        }
        if (command === 'career_slots') return [];
        if (command === 'last_valid_career') return null;
        if (command === 'career_portrait') return null;
        if (command === 'preview_club_readiness') {
          return resolvedWorld().clubs.map((club) => ({
            clubId: club.id,
            seasonId: String(args.seasonId),
            status: 'available',
            requirements: [],
          }));
        }
        if (command === 'creator_projects') return state.projects.map(summary);
        if (command === 'creator_project') {
          const project = state.projects.find((item) => item.projectId === args.projectId);
          if (!project) throw new Error('Projeto UAT não encontrado');
          return clone(project);
        }
        if (command === 'save_creator_project') {
          const draft = args.draft as {
            projectId: string;
            name: string;
            mode: 'dataStudio' | 'quickMod';
            basePackageId: string;
            source: StoredProject['source'];
          };
          const manifest = JSON.parse(draft.source.manifestJson) as {
            packageId: string;
            version: string;
          };
          const patches = draft.source.patchesJson
            ? (JSON.parse(draft.source.patchesJson) as unknown[])
            : [];
          const previous = state.projects.find((item) => item.projectId === draft.projectId);
          const now = 1_784_421_600_000 + (previous?.revision ?? 0) * 1000;
          const record: StoredProject = {
            projectId: draft.projectId,
            name: draft.name,
            mode: draft.mode,
            status: previous ? 'modified' : 'draft',
            basePackageId: draft.basePackageId,
            packageId: manifest.packageId,
            version: manifest.version,
            updatedAt: now,
            lastExportedAt: previous?.lastExportedAt ?? null,
            entityCount: patches.length,
            schemaVersion: 1,
            createdAt: previous?.createdAt ?? now,
            revision: (previous?.revision ?? 0) + 1,
            source: clone(draft.source),
          };
          state.projects = [
            ...state.projects.filter((item) => item.projectId !== record.projectId),
            record,
          ];
          writeState(state);
          return clone(record);
        }
        if (command === 'delete_creator_project') {
          state.projects = state.projects.filter((item) => item.projectId !== args.projectId);
          writeState(state);
          return null;
        }
        if (
          command === 'validate_data_package_source' ||
          command === 'export_data_package_source'
        ) {
          return { valid: true, diagnostics: [] };
        }
        if (command === 'creator_choose_save_path') return 'C:/creator-studio-uat/export.rivmod';
        if (command === 'export_rivmod') {
          const destination = String(args.destination);
          state.exports.push(destination);
          const exportedProject = state.projects.find((item) => item.projectId === args.projectId);
          if (exportedProject) {
            exportedProject.lastExportedAt = 1_784_421_700_000 + exportedProject.revision * 1000;
            exportedProject.status = 'exported';
          }
          writeState(state);
          return {
            packageId: state.projects.at(-1)?.packageId ?? 'community.uat.creator-studio',
            name: state.projects.at(-1)?.name ?? 'Creator Studio Automated UAT',
            version: state.projects.at(-1)?.version ?? '1.0.0',
            path: destination,
            size: 4096,
            sha256: 'sha256:creator-studio-uat-bundle',
            status: 'Bundle exportado',
          };
        }
        if (command === 'creator_choose_open_path') return 'C:/creator-studio-uat/export.rivmod';
        if (command === 'inspect_rivmod') {
          return {
            receipt: {
              packageId: state.projects.at(-1)?.packageId ?? 'community.uat.creator-studio',
              name: state.projects.at(-1)?.name ?? 'Creator Studio Automated UAT',
              version: state.projects.at(-1)?.version ?? '1.0.0',
              path: String(args.bundleLocation),
              size: 4096,
              sha256: 'sha256:creator-studio-uat-bundle',
              status: 'Inspecionado',
            },
            validation: { valid: true, diagnostics: [] },
            dependencies: [],
            conflicts: [],
            updateFromVersion: state.installed ? '1.0.0' : null,
            downgrade: false,
          };
        }
        if (command === 'install_rivmod' || command === 'rollback_creator_package') {
          state.installed = true;
          writeState(state);
          return {
            packageId: state.projects.at(-1)?.packageId ?? 'community.uat.creator-studio',
            name: state.projects.at(-1)?.name ?? 'Creator Studio Automated UAT',
            version:
              command === 'rollback_creator_package'
                ? String(args.version)
                : (state.projects.at(-1)?.version ?? '1.0.0'),
            path: 'C:/creator-studio-uat/catalog/community.uat.creator-studio',
            size: 4096,
            sha256: 'sha256:creator-studio-uat-bundle',
            status: command === 'rollback_creator_package' ? 'Rollback concluído' : 'Instalado',
          };
        }
        if (command === 'creator_package_history') {
          return [
            {
              packageId: String(args.packageId),
              version: '1.0.0',
              name: 'Creator Studio Automated UAT',
              archivedAt: 1_784_421_600_000,
            },
          ];
        }
        if (command === 'exit_application') return null;
        throw new Error(`Comando inesperado no Creator Studio UAT: ${command}`);
      },
    };
    (
      window as unknown as {
        __TAURI_INTERNALS__: typeof bridge;
        __CREATOR_STUDIO_UAT__: { readState: () => State };
      }
    ).__TAURI_INTERNALS__ = bridge;
    (
      window as unknown as {
        __CREATOR_STUDIO_UAT__: { readState: () => State };
      }
    ).__CREATOR_STUDIO_UAT__ = { readState };
  });
});

test('Creator Studio functional UAT', async ({ page }, testInfo) => {
  test.setTimeout(180_000);

  await test.step('01 Projeto — criar, salvar, fechar e reabrir', async () => {
    await page.goto(editorUrl);
    await page.getByRole('textbox', { name: 'Nome do mod' }).fill('Creator Studio Automated UAT');
    await page.getByRole('textbox', { name: 'Seu nome ou apelido' }).fill('Rivallo UAT');
    await page
      .getByRole('textbox', { name: 'O que este mod faz?' })
      .fill('Fixture isolada para validar o Creator Studio de ponta a ponta.');
    await page.getByRole('radio', { name: 'Data Studio' }).click();
    await page.getByRole('button', { name: 'Salvar rascunho' }).last().click();
    await expect(page.getByText('Projeto salvo · revisão 1.')).toBeVisible();
    await page.reload();
    await page
      .getByRole('button', { name: /Creator Studio Automated UAT/u })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Creator Studio Automated UAT' })).toBeVisible();
    await screenshot(page, testInfo, '01-projeto');
  });

  await test.step('02 Geografia — Brasil, São Paulo e autoridade de contagem', async () => {
    await page.getByRole('button', { name: 'Divisões administrativas' }).click();
    await expect(page.getByText('0 divisões administrativas cadastradas')).toBeVisible();
    await page
      .locator('.studio-module-toolbar')
      .getByRole('button', { name: 'Criar novo' })
      .click();
    await page.getByRole('textbox', { name: 'Nome' }).fill('São Paulo');
    await page.getByRole('combobox', { name: /Na..o/u }).selectOption('nation.brazil');
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('button', { name: 'Salvar rascunho' })
      .click();
    await expect(page.getByText('1 divisão administrativa cadastrada')).toBeVisible();
    await expect(page.locator('.studio-table-toolbar').getByText('1 itens')).toBeVisible();
    await screenshot(page, testInfo, '02-divisao-administrativa');

    await page.getByRole('button', { name: 'Cidades', exact: true }).click();
    await page
      .locator('.studio-module-toolbar')
      .getByRole('button', { name: 'Criar novo' })
      .click();
    await page.getByRole('textbox', { name: 'Nome' }).fill('São Paulo');
    await page.getByRole('combobox', { name: /Na..o/u }).selectOption('nation.brazil');
    await page
      .getByRole('combobox', { name: /Divis.o administrativa/u })
      .selectOption({ label: 'São Paulo' });
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('button', { name: 'Salvar rascunho' })
      .click();
    const cityRow = page.getByRole('row', { name: /Selecionar São Paulo/u });
    await expect(cityRow).toContainText('São Paulo');
    await expect(cityRow).toContainText('São Paulo · Brasil');
    await screenshot(page, testInfo, '02-cidade');
  });

  await test.step('03 Estádio — Estádio Horizonte sem clube', async () => {
    await page.getByRole('button', { name: /^Est.dios$/u }).click();
    await page
      .locator('.studio-module-toolbar')
      .getByRole('button', { name: 'Criar novo' })
      .click();
    await page.getByRole('textbox', { name: 'Nome' }).fill('Estádio Horizonte');
    await page.getByRole('combobox', { name: 'Cidade' }).selectOption({ label: 'São Paulo' });
    await page.getByRole('spinbutton', { name: 'Capacidade' }).fill('66795');
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('button', { name: 'Salvar rascunho' })
      .click();
    await expect(page.getByText('Estádio Horizonte', { exact: true }).first()).toBeVisible();
    await screenshot(page, testInfo, '03-estadio-Estádio Horizonte');
  });

  await test.step('04 Clube — Aurora FC como Add e rascunho sem competição', async () => {
    await page.getByRole('button', { name: 'Clubes', exact: true }).click();
    await page
      .locator('.studio-module-toolbar')
      .getByRole('button', { name: 'Criar novo' })
      .click();
    await page.getByRole('textbox', { name: 'Nome completo' }).fill('Aurora Futebol Clube');
    await page.getByRole('textbox', { name: 'Sigla' }).fill('afc');
    await page.getByRole('combobox', { name: 'Cidade' }).selectOption({ label: 'São Paulo' });
    await page.getByRole('combobox', { name: 'País' }).selectOption({ label: 'Brasil' });
    await page.getByRole('combobox', { name: 'Estádio' }).selectOption({ label: 'Estádio Horizonte' });
    await page.getByRole('button', { name: 'Adicionar clube ao mod' }).click();
    await expect(page.getByText('Aurora Futebol Clube', { exact: true }).first()).toBeVisible();
    await screenshot(page, testInfo, '04-clube-afc');
    const operation = await page.evaluate(() => {
      const state = (
        window as unknown as {
          __CREATOR_STUDIO_UAT__: {
            readState: () => {
              projects: Array<{ source: { patchesJson: string | null } }>;
            };
          };
        }
      ).__CREATOR_STUDIO_UAT__.readState();
      const source = state.projects.at(-1)?.source.patchesJson;
      return source ? source : '[]';
    });
    expect(operation).not.toContain('"operation":"replace"');
  });

  await test.step('05 Asset — escudo sintético persistente por assetId, sem blob salvo', async () => {
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Entidade' })
      .selectOption({ label: 'Aurora Futebol Clube · clubCrest' });
    await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
      name: 'afc-uat.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await expect(page.getByRole('img', { name: 'Preview em card' })).toBeVisible();
    await expect(page.getByText('1').last()).toBeVisible();
    await page.getByRole('button', { name: 'Salvar rascunho' }).first().click();
    await screenshot(page, testInfo, '05-asset-escudo');

    const persisted = await page.evaluate(() => {
      const state = (
        window as unknown as {
          __CREATOR_STUDIO_UAT__: {
            readState: () => {
              projects: Array<{
                source: {
                  assets: Array<{ id: string; entityId: string; bytes: number[] }>;
                  manifestJson: string;
                  patchesJson: string | null;
                };
              }>;
            };
          };
        }
      ).__CREATOR_STUDIO_UAT__.readState();
      return state.projects.at(-1)?.source;
    });
    expect(persisted?.assets).toHaveLength(1);
    expect(persisted?.assets[0]).toMatchObject({
      id: expect.stringContaining('.clubCrest'),
      entityId: expect.stringContaining('.club.'),
    });
    expect(JSON.stringify(persisted)).not.toContain('blob:');

    await page.getByRole('button', { name: 'Visão geral' }).click();
    await page.reload();
    await page
      .getByRole('button', { name: /Creator Studio Automated UAT/u })
      .first()
      .click();
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Entidade' })
      .selectOption({ label: 'Aurora Futebol Clube · clubCrest' });
    await expect(page.getByRole('img', { name: 'Preview em card' })).toBeVisible();
    await screenshot(page, testInfo, '05-asset-reaberto');
  });

  await test.step('06–08 Competição, temporada explícita e participante sem duplicação', async () => {
    await page.getByRole('button', { name: /^Competi..es$/u }).click();
    await page
      .locator('.studio-module-toolbar')
      .getByRole('button', { name: 'Criar novo' })
      .click();
    await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Liga Horizonte');
    await page.getByRole('textbox', { name: /Nome curto ou sigla/u }).fill('Brasileirão');
    await expect(page.getByText('Nenhuma temporada será criada')).toBeVisible();
    await page.getByRole('radio', { name: /Criar nova temporada/u }).click();
    await expect(
      page.getByText('A temporada 2026 será criada e vinculada a esta competição.'),
    ).toBeVisible();
    await screenshot(page, testInfo, '06-temporada-explicita');
    const afc = page.getByRole('checkbox', { name: /Aurora Futebol Clube/u });
    await afc.check();
    await afc.uncheck();
    await afc.check();
    await expect(afc).toBeChecked();
    await page.getByRole('button', { name: 'Salvar competição' }).click();
    await expect(page.getByText('Liga Horizonte', { exact: true }).first()).toBeVisible();
    await screenshot(page, testInfo, '06-competicao-brasileirao');

    await page.getByRole('button', { name: 'Temporadas', exact: true }).click();
    await expect(page.locator('.studio-table-toolbar').getByText('1 itens')).toBeVisible();
    const seasonRow = page
      .getByLabel('Lista de Temporadas')
      .getByRole('row')
      .filter({ hasText: '2026' });
    await seasonRow.getByRole('button', { name: /2026/u }).click();
    await page.locator('.studio-module-toolbar').getByRole('button', { name: 'Excluir' }).click();
    await page
      .getByRole('alertdialog', { name: 'Excluir 2026?' })
      .getByRole('button', { name: 'Excluir do draft' })
      .click();
    await expect(page.getByRole('heading', { name: 'Nenhum item em temporadas' })).toBeVisible();
    await page.getByRole('button', { name: 'Desfazer' }).first().click();
    await expect(page.locator('.studio-table-toolbar').getByText('1 itens')).toBeVisible();

    await page.getByRole('button', { name: /^Competi..es$/u }).click();
    const competitionRow = page
      .getByLabel('Lista de Competições')
      .getByRole('row')
      .filter({ hasText: 'Liga Horizonte' });
    await competitionRow.getByRole('button', { name: /Liga Horizonte/u }).click();
    await page.locator('.studio-module-toolbar').getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('radio', { name: /Usar temporada existente/u })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('button', { name: 'Salvar competição' }).click();
    await page.getByRole('radio', { name: /Criar nova temporada/u }).click();
    await page.getByRole('textbox', { name: 'Temporada' }).fill('2027');
    await page.getByRole('button', { name: 'Temporadas', exact: true }).click();
    await expect(page.locator('.studio-table-toolbar').getByText('1 itens')).toBeVisible();
    await expect(page.getByText('2027', { exact: true })).toHaveCount(0);
  });

  await test.step('09 Pessoas — treinador, auxiliar, goleiro e dois jogadores por CRUD visual', async () => {
    const createPerson = async (
      moduleName: 'Treinadores' | 'Comissão',
      fullName: string,
      roleIdLabel: 'Coach ID' | 'Staff member ID',
      roleId: string,
      roleTitle: string,
    ) => {
      await page.getByRole('button', { name: moduleName, exact: true }).click();
      await page
        .locator('.studio-module-toolbar')
        .getByRole('button', { name: 'Criar novo' })
        .click();
      const inspector = page.getByLabel('Inspector da entidade');
      await inspector.getByRole('textbox', { name: 'Nome factual' }).fill(fullName);
      await inspector
        .getByRole('textbox', { name: 'Nome conhecido' })
        .fill(fullName.split(' ')[0]!);
      await inspector.getByRole('textbox', { name: roleIdLabel }).fill(roleId);
      await inspector.getByRole('textbox', { name: 'Cargo ou função' }).fill(roleTitle);
      await inspector
        .getByRole('combobox', { name: 'Clube' })
        .selectOption({ label: 'Aurora Futebol Clube' });
      await inspector
        .getByRole('textbox', { name: 'Fonte', exact: true })
        .fill('creator-studio.synthetic');
      await expect(inspector.getByText('Avaliação pendente', { exact: true })).toBeVisible();
      await expect(inspector.getByText('Bloqueada para gameplay', { exact: true })).toBeVisible();
      await inspector.getByRole('button', { name: 'Salvar fatos' }).click();
      await expect(page.getByText(fullName.split(' ')[0]!, { exact: true }).first()).toBeVisible();
    };
    const createPlayer = async (fullName: string, position: 'GK' | 'CB' | 'CM') => {
      await page.getByRole('button', { name: 'Jogadores', exact: true }).click();
      await page
        .locator('.studio-module-toolbar')
        .getByRole('button', { name: 'Criar novo' })
        .click();
      const inspector = page.getByLabel('Inspector da entidade');
      await inspector.getByRole('textbox', { name: 'Nome factual' }).fill(fullName);
      await inspector
        .getByRole('textbox', { name: 'Nome conhecido' })
        .fill(fullName.split(' ')[0]!);
      await inspector
        .getByRole('textbox', { name: 'Player ID' })
        .fill(`player-${fullName.toLocaleLowerCase('pt-BR').replace(/\s+/gu, '-')}`);
      await inspector
        .getByRole('combobox', { name: 'Clube' })
        .selectOption({ label: 'Aurora Futebol Clube' });
      await inspector.getByRole('combobox', { name: 'Posição detalhada' }).selectOption(position);
      await inspector
        .getByRole('textbox', { name: 'Fonte', exact: true })
        .fill('creator-studio.synthetic');
      await expect(inspector.getByText('Avaliação pendente', { exact: true })).toBeVisible();
      await expect(inspector.getByText('Bloqueada para gameplay', { exact: true })).toBeVisible();
      await inspector.getByRole('button', { name: 'Salvar fatos' }).click();
      await expect(page.getByText(fullName.split(' ')[0]!, { exact: true }).first()).toBeVisible();
    };

    await createPerson(
      'Treinadores',
      'Marcos UAT',
      'Coach ID',
      'coach-marcos-uat',
      'Treinador principal',
    );
    await createPerson(
      'Comissão',
      'Paula UAT',
      'Staff member ID',
      'staff-paula-uat',
      'Auxiliar técnico',
    );
    await createPlayer('Rafael UAT', 'GK');
    await createPlayer('Carlos UAT', 'CB');
    await createPlayer('Lucas UAT', 'CM');
    await page.getByRole('button', { name: 'Comissão', exact: true }).click();
    await expect(page.getByText('Paula', { exact: true }).first()).toBeVisible();
    await screenshot(page, testInfo, '09-comissao-e-pessoas');
  });

  await test.step('09b Elenco restante — fixture CSV revisada e importada', async () => {
    await page.getByRole('button', { name: 'Importar CSV', exact: true }).click();
    await page.getByRole('combobox', { name: 'Entidade' }).selectOption('player');
    const headers = [
      'internalId',
      'roleId',
      'externalSource',
      'externalId',
      'fullName',
      'knownName',
      'clubId',
      'nationalityId',
      'birthDate',
      'position',
      'shirtNumber',
      'source',
      'sourceRecordId',
      'verificationStatus',
    ];
    const clubId = 'test.synthetic.world.club.sao-paulo-futebol-clube';
    const rows = Array.from({ length: 15 }, (_, index) =>
      [
        `uat.creator.player.${index + 4}`,
        `uat.creator.player-role.${index + 4}`,
        'creator-studio-uat',
        `creator-uat-${index + 4}`,
        `Jogador Fixture ${index + 4}`,
        `Fixture ${index + 4}`,
        clubId,
        'nation.brazil',
        '2000-01-01',
        index === 0 ? 'GK' : index % 2 === 0 ? 'CB' : 'CM',
        String(index + 4),
        'creator-studio.synthetic',
        `creator-uat-${index + 4}`,
        'pending',
      ].join(','),
    );
    await page.locator('input[type="file"][accept*="csv"]').setInputFiles({
      name: 'elenco-restante-uat.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([headers.join(','), ...rows].join('\n')),
    });
    await expect(page.getByText('15 registros', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Revisar e importar 15' }).click();
    await expect(page.getByRole('button', { name: 'Desfazer último lote' })).toBeVisible();
    await screenshot(page, testInfo, '09-importacao-elenco-csv');
  });

  await test.step('10 Contratos e inscrições — lote acumulativo, idempotente e sem duplicação', async () => {
    const clubId = 'test.synthetic.world.club.sao-paulo-futebol-clube';
    const competitionId = 'test.synthetic.world.competition.sample-league-2026';
    const seasonId = `${competitionId}.season.2026`;
    const visualPlayerIds = [
      'community.person.player-rafael-uat',
      'community.person.player-carlos-uat',
      'community.person.player-lucas-uat',
    ];
    const csvPlayerIds = Array.from(
      { length: 15 },
      (_, index) => `uat.creator.player.${index + 4}`,
    );
    const allPlayerIds = [...visualPlayerIds, ...csvPlayerIds];

    await page.getByRole('combobox', { name: 'Entidade' }).selectOption('contract');
    const contractHeaders = [
      'internalId',
      'personId',
      'clubId',
      'startedAt',
      'expiresAt',
      'status',
    ];
    const contractRows = csvPlayerIds.map((playerId, index) =>
      [`uat.contract.${index + 4}`, playerId, clubId, '2026-01-01', '2028-12-31', 'Ativo'].join(
        ',',
      ),
    );
    await page.locator('input[type="file"][accept*="csv"]').setInputFiles({
      name: 'contratos-uat.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([contractHeaders.join(','), ...contractRows].join('\n')),
    });
    await page.getByRole('button', { name: 'Revisar e importar 15' }).click();

    await page.getByRole('combobox', { name: 'Entidade' }).selectOption('registration');
    const registrationHeaders = [
      'internalId',
      'competitionId',
      'seasonId',
      'playerId',
      'clubId',
      'shirtNumber',
    ];
    const registrationRows = allPlayerIds.map((playerId, index) =>
      [
        `uat.registration.${index + 1}`,
        competitionId,
        seasonId,
        playerId,
        clubId,
        String(index + 1),
      ].join(','),
    );
    const registrationCsv = Buffer.from(
      [registrationHeaders.join(','), ...registrationRows].join('\n'),
    );
    const registrationInput = page.locator('input[type="file"][accept*="csv"]');
    await registrationInput.setInputFiles({
      name: 'inscricoes-uat.csv',
      mimeType: 'text/csv',
      buffer: registrationCsv,
    });
    await page.getByRole('button', { name: 'Revisar e importar 18' }).click();
    await registrationInput.setInputFiles({
      name: 'inscricoes-uat-repetidas.csv',
      mimeType: 'text/csv',
      buffer: registrationCsv,
    });
    await page.getByRole('button', { name: 'Revisar e importar 18' }).click();

    await page.getByRole('button', { name: 'Inscrições', exact: true }).click();
    await expect(page.locator('.studio-table-toolbar').getByText('18 itens')).toBeVisible();
    await page.getByRole('button', { name: 'Contratos', exact: true }).click();
    await expect(page.locator('.studio-table-toolbar').getByText('15 itens')).toBeVisible();
    await screenshot(page, testInfo, '10-contratos-inscricoes');
  });

  await test.step('11 Readiness — validade estrutural sem liberar gameplay', async () => {
    await page.getByRole('button', { name: 'Clubes', exact: true }).click();
    const clubRow = page
      .getByLabel('Lista de Clubes')
      .getByRole('row')
      .filter({ hasText: 'Aurora Futebol Clube' });
    await expect(clubRow).toContainText('Rascunho incompleto');
    await clubRow.getByRole('button', { name: /Aurora Futebol Clube/u }).click();
    await expect(
      page.getByLabel('Inspector da entidade').getByText('Sem competição inicial'),
    ).toBeVisible();
    await expect(
      page.getByLabel('Inspector da entidade').getByText('Campo: competitionId'),
    ).toBeVisible();
    await expect(
      page.getByLabel('Inspector da entidade').getByRole('button', { name: 'Resolver' }).first(),
    ).toBeVisible();
    await screenshot(page, testInfo, '11-readiness-bloqueada');

    await page.locator('.studio-module-toolbar').getByRole('button', { name: 'Editar' }).click();
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('combobox', { name: 'Competição' })
      .selectOption({ label: 'Liga Horizonte' });
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('button', { name: 'Salvar edição do clube' })
      .click();
    await waitForDraftSaved(page);
    await expect
      .poll(() => readPersistedUatClub(page))
      .toMatchObject({
        competitionId: expect.stringContaining('sample-league-2026'),
      });

    await page.getByRole('button', { name: /^Competi..es$/u }).click();
    const competitionRow = page
      .getByLabel('Lista de Competições')
      .getByRole('row')
      .filter({ hasText: 'Liga Horizonte' });
    await expect(competitionRow).toContainText('Estruturalmente válido');
    await screenshot(page, testInfo, '11-readiness-estrutural');

    await page.getByRole('button', { name: 'Clubes', exact: true }).click();
    const readyClubRow = page
      .getByLabel('Lista de Clubes')
      .getByRole('row')
      .filter({ hasText: 'Aurora Futebol Clube' });
    await expect(readyClubRow).toContainText('Rascunho incompleto');
    await readyClubRow.getByRole('button', { name: /Aurora Futebol Clube/u }).click();
    await expect(
      page.getByLabel('Inspector da entidade').getByText('0 de 18 jogadores mínimos'),
    ).toBeVisible();
    await expect(
      page.getByLabel('Inspector da entidade').getByText('Nenhum goleiro disponível'),
    ).toBeVisible();
    await expect(
      page.getByLabel('Inspector da entidade').getByText('Nenhum treinador principal'),
    ).toBeVisible();
    await screenshot(page, testInfo, '11-readiness-gameplay-bloqueada');
  });

  await test.step('12 Sandbox — snapshot temporário sem carreira, calendário ou resultado', async () => {
    await page.getByRole('button', { name: 'Testar em sandbox' }).click();
    await expect(page.getByRole('heading', { name: 'Teste sem alterar carreiras' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar snapshot e testar' }).click();
    await expect(page.getByRole('heading', { name: 'Pacote válido' })).toBeVisible();
    const state = await page.evaluate(() =>
      (
        window as unknown as {
          __CREATOR_STUDIO_UAT__: { readState: () => { invocations: string[] } };
        }
      ).__CREATOR_STUDIO_UAT__.readState(),
    );
    expect(state.invocations).not.toContain('create_career');
    await screenshot(page, testInfo, '12-sandbox');
  });

  await test.step('13 Exportação — validar, gerar bundle e permanecer inativo', async () => {
    await page.getByRole('button', { name: 'Exportar .rivmod' }).click();
    await expect(page.getByText(/Creator Studio Automated UAT 1.0.0 exportado/u)).toBeVisible();
    const state = await page.evaluate(() =>
      (
        window as unknown as {
          __CREATOR_STUDIO_UAT__: {
            readState: () => { exports: string[]; installed: boolean; invocations: string[] };
          };
        }
      ).__CREATOR_STUDIO_UAT__.readState(),
    );
    expect(state.exports).toEqual(['C:/creator-studio-uat/export.rivmod']);
    expect(state.installed).toBe(false);
    expect(state.invocations).toContain('export_rivmod');
    await screenshot(page, testInfo, '13-exportacao');
  });

  await test.step('14 Instalação — inspeção, hashes e catálogo temporário', async () => {
    await page.getByRole('button', { name: 'Instalar arquivo' }).click();
    const dialog = page.getByRole('dialog', { name: /Instalar Creator Studio Automated UAT/u });
    await expect(dialog).toContainText('Válido');
    await expect(dialog).toContainText('Nenhum');
    await expect(dialog).toContainText('sha256:creator-studio-uat-bundle');
    await screenshot(page, testInfo, '14-instalacao-inspecao');
    await dialog.getByRole('button', { name: 'Confirmar instalação' }).click();
    await expect(
      page.getByText(/foi instalado. Nenhuma carreira existente foi alterada/u),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /Instalados 1/u })).toBeVisible();
    await screenshot(page, testInfo, '14-instalacao-concluida');
  });

  await test.step('15 Versionamento — 1.0.1, história, diff, atualização e rollback', async () => {
    await page
      .getByRole('button', { name: 'Ações de Creator Studio Automated UAT' })
      .first()
      .click();
    await page.getByText('Criar nova versão', { exact: true }).click();
    const versionDialog = page.getByRole('dialog', { name: 'O que mudou nesta versão?' });
    await versionDialog
      .getByRole('textbox', { name: 'Notas da versão' })
      .fill('Adiciona a história revisada do Aurora FC.');
    await versionDialog.getByRole('button', { name: 'Criar projeto da nova versão' }).click();
    await expect(page.getByText(/1.0.1 · official.rivallo.foundation/u)).toBeVisible();

    await page.getByRole('button', { name: 'Clubes', exact: true }).click();
    const clubRow = page
      .getByLabel('Lista de Clubes')
      .getByRole('row')
      .filter({ hasText: 'Aurora Futebol Clube' });
    await clubRow.getByRole('button', { name: /Aurora Futebol Clube/u }).click();
    await page.locator('.studio-module-toolbar').getByRole('button', { name: 'Editar' }).click();
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('textbox', { name: 'História do clube' })
      .fill(
        'Fundado em 1930, o Aurora FC construiu uma trajetória de conquistas nacionais e internacionais no Estádio Horizonte.',
      );
    await page
      .getByLabel('Inspector da entidade')
      .getByRole('button', { name: 'Salvar edição do clube' })
      .click();
    await waitForDraftSaved(page);
    await expect
      .poll(() => readPersistedUatClub(page))
      .toMatchObject({
        historySummary: expect.stringContaining('Fundado em 1930'),
      });
    await page.getByRole('button', { name: 'Patches', exact: true }).click();
    await expect(page.getByText('Aurora Futebol Clube', { exact: true }).first()).toBeVisible();
    await screenshot(page, testInfo, '15-versao-1-0-1-revisao');

    await page.getByRole('button', { name: 'Exportar .rivmod' }).click();
    await expect(page.getByText(/Creator Studio Automated UAT 1.0.1 exportado/u)).toBeVisible();
    await page.getByRole('button', { name: 'Instalar arquivo' }).click();
    const updateDialog = page.getByRole('dialog', {
      name: /Instalar Creator Studio Automated UAT/u,
    });
    await expect(updateDialog).toContainText('1.0.0 → 1.0.1');
    await updateDialog.getByRole('button', { name: 'Confirmar instalação' }).click();
    await screenshot(page, testInfo, '15-atualizacao-1-0-1');

    const installedGroup = page
      .locator('.creator-library-group')
      .filter({ has: page.getByRole('heading', { name: /Instalados 1/u }) });
    await installedGroup
      .getByRole('button', { name: 'Ações de Creator Studio Automated UAT' })
      .click();
    await page.getByText('Ver histórico e rollback', { exact: true }).click();
    const historyDialog = page.getByRole('dialog', { name: 'Versões anteriores' });
    await expect(historyDialog).toContainText('Creator Studio Automated UAT 1.0.0');
    await screenshot(page, testInfo, '15-historico-rollback');
    await historyDialog.getByRole('button', { name: 'Restaurar' }).click();
    await expect(page.getByText(/voltou com segurança para a versão 1.0.0/u)).toBeVisible();

    await page.getByRole('button', { name: 'Instalar arquivo' }).click();
    const reinstallDialog = page.getByRole('dialog', {
      name: /Instalar Creator Studio Automated UAT/u,
    });
    await expect(reinstallDialog).toContainText('1.0.0 → 1.0.1');
    await reinstallDialog.getByRole('button', { name: 'Confirmar instalação' }).click();
    await expect(
      page.getByText(/1.0.1 foi instalado. Nenhuma carreira existente foi alterada/u),
    ).toBeVisible();
  });

  await test.step('16 Nova Carreira — pacote com avaliação pendente permanece bloqueado', async () => {
    await page.goto(mainMenuUrl);
    await page.getByRole('button', { name: 'Nova carreira' }).click();
    await expect(
      page.getByRole('heading', { name: 'Escolha os dados desta carreira' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Creator Studio Automated UAT/u })).toHaveCount(
      0,
    );
    await expect(page.getByRole('radio', { name: /Base oficial Rivallo/u })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const state = await page.evaluate(() =>
      (
        window as unknown as {
          __CREATOR_STUDIO_UAT__: { readState: () => { invocations: string[] } };
        }
      ).__CREATOR_STUDIO_UAT__.readState(),
    );
    expect(state.invocations).not.toContain('create_career');
    await screenshot(page, testInfo, '16-nova-carreira-bloqueada');
  });

  await test.step('17 Cobertura responsiva — 1024, 1920 e zoom 200%', async () => {
    await page.goto(editorUrl);
    await page
      .getByRole('button', { name: /Creator Studio Automated UAT/u })
      .first()
      .click();
    for (const viewport of [
      { width: 1024, height: 768, name: '17-1024x768' },
      { width: 1920, height: 1080, name: '17-1920x1080' },
    ]) {
      await page.setViewportSize(viewport);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await screenshot(page, testInfo, viewport.name);
    }
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    await expect(page.getByRole('button', { name: 'Visão geral' })).toBeVisible();
    await screenshot(page, testInfo, '17-zoom-200');
    await page.evaluate(() => {
      document.body.style.zoom = '';
    });
  });
});
