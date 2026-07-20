import { useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import { AssetManager } from './AssetManager.js';
import { CommunityEntityEditor } from './CommunityEntityEditor.js';
import { CompetitionBuilder } from './CompetitionBuilder.js';
import { CsvImport } from './CsvImport.js';
import { PackageValidationSummary } from './PackageValidationSummary.js';
import type { CommunityChange, ModAuthoringWorld, PackageValidationReport } from './types.js';

const modules = [
  ['overview', 'Visão geral'],
  ['nations', 'Nações e regiões'],
  ['cities', 'Cidades'],
  ['stadiums', 'Estádios'],
  ['clubs', 'Clubes'],
  ['players', 'Jogadores'],
  ['coaches', 'Treinadores'],
  ['staff', 'Comissão'],
  ['competitions', 'Competições'],
  ['seasons', 'Temporadas'],
  ['contracts', 'Contratos'],
  ['registrations', 'Inscrições'],
  ['assets', 'Assets'],
  ['translations', 'Traduções'],
  ['patches', 'Patches'],
  ['validation', 'Validação'],
  ['advanced', 'Configuração avançada'],
] as const;

type StudioModule = (typeof modules)[number][0] | 'import' | 'sandbox';

const labelFor = (kind: CommunityChange['kind']) =>
  ({
    club: 'Clube',
    player: 'Jogador',
    coach: 'Treinador',
    nation: 'Nação',
    region: 'Região',
    city: 'Cidade',
    stadium: 'Estádio',
    competition: 'Competição',
    season: 'Temporada',
    registration: 'Inscrição',
    asset: 'Asset',
  })[kind];

export function DataStudio({
  world,
  author,
  changes,
  initialModule,
  report,
  onUpsert,
  onBatch,
  onRollback,
  onValidate,
}: {
  readonly world: ModAuthoringWorld;
  readonly author: string;
  readonly changes: readonly CommunityChange[];
  readonly initialModule?: string | null;
  readonly report: PackageValidationReport | null;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly onBatch: (changes: readonly CommunityChange[]) => void;
  readonly onRollback: (ids: readonly string[]) => void;
  readonly onValidate: () => Promise<void>;
}) {
  const safeInitial = modules.some(([id]) => id === initialModule)
    ? (initialModule as StudioModule)
    : 'overview';
  const [module, setModule] = useState<StudioModule>(safeInitial);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const tableRows = useMemo(() => {
    const source =
      module === 'clubs'
        ? world.clubs.map((item) => ({
            id: item.id,
            name: item.name,
            detail: `${item.city} · ${item.shortName}`,
          }))
        : module === 'players'
          ? world.players.map((item) => ({
              id: item.id,
              name: item.name,
              detail: `${item.position} · ${item.rating}/${item.potentialRating}`,
            }))
          : module === 'coaches'
            ? world.coaches.map((item) => ({
                id: item.identity.entityId,
                name: item.identity.knownName,
                detail: `${item.role} · ${item.identity.clubName}`,
              }))
            : module === 'nations'
              ? world.nations.map((item) => ({ id: item.id, name: item.name, detail: item.iso2 }))
              : module === 'cities'
                ? (world.cities ?? []).map((item) => ({
                    id: item.id,
                    name: item.name,
                    detail: item.nationId,
                  }))
                : module === 'stadiums'
                  ? (world.stadiums ?? []).map((item) => ({
                      id: item.id,
                      name: item.name,
                      detail: `${item.capacity.toLocaleString('pt-BR')} lugares`,
                    }))
                  : [];
    return source.filter((item) =>
      `${item.name} ${item.detail}`.toLowerCase().includes(search.trim().toLowerCase()),
    );
  }, [module, search, world]);
  const visibleRows = tableRows.slice(page * 50, page * 50 + 50);
  const entityModule = ['clubs', 'players', 'coaches'].includes(module);

  return (
    <div className="data-studio">
      <aside className="data-studio__nav" aria-label="Módulos do Data Studio">
        <div>
          <strong>Data Studio</strong>
          <span>Base completa</span>
        </div>
        <nav>
          {modules.map(([id, label]) => (
            <button
              aria-current={module === id ? 'page' : undefined}
              key={id}
              onClick={() => {
                setModule(id);
                setPage(0);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="data-studio__import" onClick={() => setModule('import')} type="button">
          Importar CSV
        </button>
        <button className="data-studio__sandbox" onClick={() => setModule('sandbox')} type="button">
          Testar em sandbox
        </button>
      </aside>
      <main className="data-studio__main">
        {module === 'overview' && (
          <section className="studio-overview">
            <header>
              <span>Visão geral</span>
              <h2>Sua base, de ponta a ponta</h2>
              <p>Crie, importe, relacione, valide e distribua no mesmo projeto canônico.</p>
            </header>
            <dl className="studio-metrics">
              <div>
                <dt>Clubes</dt>
                <dd>{world.clubs.length}</dd>
              </div>
              <div>
                <dt>Jogadores</dt>
                <dd>{world.players.length}</dd>
              </div>
              <div>
                <dt>Profissionais</dt>
                <dd>{world.coaches.length}</dd>
              </div>
              <div>
                <dt>Competições</dt>
                <dd>{world.competitions?.length ?? 0}</dd>
              </div>
              <div>
                <dt>Mudanças</dt>
                <dd>{changes.length}</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>{changes.filter((item) => item.asset).length}</dd>
              </div>
            </dl>
            <section className="studio-panel studio-readiness">
              <div>
                <h3>Checklist da base</h3>
                <p>O Creator Studio mantém a definição separada da simulação esportiva.</p>
              </div>
              <ul>
                <li data-complete={world.nations.length > 0}>Identidades territoriais</li>
                <li data-complete={(world.competitions?.length ?? 0) > 0}>
                  Competições e temporadas
                </li>
                <li data-complete={world.clubs.length > 0}>Clubes e relações</li>
                <li data-complete={world.players.length >= 18}>Elencos</li>
                <li data-complete={world.coaches.length > 0}>Treinadores</li>
              </ul>
            </section>
            <div className="studio-quick-actions">
              <Button onClick={() => setModule('competitions')} variant="primary">
                Criar competição
              </Button>
              <Button onClick={() => setModule('import')} variant="secondary">
                Importar dados
              </Button>
              <Button onClick={() => setModule('assets')} variant="secondary">
                Gerenciar assets
              </Button>
            </div>
          </section>
        )}

        {module === 'competitions' && (
          <CompetitionBuilder author={author} onUpsert={onUpsert} world={world} />
        )}
        {module === 'assets' && <AssetManager author={author} onUpsert={onUpsert} world={world} />}
        {module === 'import' && (
          <CsvImport onImport={onBatch} onRollback={onRollback} world={world} />
        )}
        {module === 'validation' && (
          <section className="studio-validation">
            <header>
              <span>Validação incremental</span>
              <h2>Erros, warnings e impacto</h2>
              <p>Diagnósticos apontam a entidade, o campo e a correção sugerida.</p>
            </header>
            <Button onClick={() => void onValidate()} variant="primary">
              Validar projeto
            </Button>
            {report ? (
              <PackageValidationSummary report={report} />
            ) : (
              <p className="studio-empty">O projeto ainda não foi validado nesta sessão.</p>
            )}
          </section>
        )}
        {module === 'sandbox' && (
          <section className="studio-sandbox">
            <header>
              <span>Snapshot temporário</span>
              <h2>Sandbox do pacote</h2>
              <p>Simule a leitura do conteúdo sem criar carreira ou alterar saves existentes.</p>
            </header>
            <div className="sandbox-summary">
              <dl>
                <div>
                  <dt>Clubes</dt>
                  <dd>{world.clubs.length}</dd>
                </div>
                <div>
                  <dt>Jogadores</dt>
                  <dd>{world.players.length}</dd>
                </div>
                <div>
                  <dt>Treinadores</dt>
                  <dd>{world.coaches.length}</dd>
                </div>
                <div>
                  <dt>Competições</dt>
                  <dd>{world.competitions?.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Retratos/assets</dt>
                  <dd>{changes.filter((item) => item.asset).length}</dd>
                </div>
              </dl>
              <Button onClick={() => void onValidate()} variant="primary">
                Criar snapshot e testar
              </Button>
            </div>
            {report && <PackageValidationSummary report={report} />}
          </section>
        )}

        {(entityModule || ['nations', 'cities', 'stadiums'].includes(module)) && (
          <section className="studio-entities">
            <header>
              <div>
                <span>{modules.find(([id]) => id === module)?.[1]}</span>
                <h2>Dados e relações</h2>
                <p>Busca indexada, seleção em massa e edição guiada por IDs estáveis.</p>
              </div>
              <Button onClick={() => setModule('import')} variant="secondary">
                Importar CSV
              </Button>
            </header>
            <div className="studio-entity-layout">
              <section className="studio-entity-table">
                <div className="studio-table-toolbar">
                  <input
                    aria-label="Buscar entidades"
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(0);
                    }}
                    placeholder="Buscar por nome, clube ou posição"
                    value={search}
                  />
                  <span>{tableRows.length.toLocaleString('pt-BR')} itens</span>
                </div>
                <div className="studio-table-list" role="table">
                  {visibleRows.map((item) => (
                    <label key={item.id} role="row">
                      <input
                        aria-label={`Selecionar ${item.name}`}
                        checked={selected.includes(item.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, item.id]
                              : current.filter((id) => id !== item.id),
                          )
                        }
                        type="checkbox"
                      />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <footer>
                  <Button
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                    variant="secondary"
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {page + 1} de {Math.max(1, Math.ceil(tableRows.length / 50))}
                  </span>
                  <Button
                    disabled={(page + 1) * 50 >= tableRows.length}
                    onClick={() => setPage((value) => value + 1)}
                    variant="secondary"
                  >
                    Próxima
                  </Button>
                </footer>
              </section>
              <aside className="studio-inspector">
                <span>Inspector</span>
                <strong>
                  {selected.length ? `${selected.length} selecionado(s)` : 'Nenhuma seleção'}
                </strong>
                <p>
                  Referências, dependentes, provenance e impacto aparecem aqui antes da aplicação.
                </p>
                {selected.length > 0 && (
                  <>
                    <label>
                      Ação em massa
                      <select>
                        <option>Definir clube</option>
                        <option>Alterar posição</option>
                        <option>Atualizar provenance</option>
                        <option>Criar inscrições</option>
                      </select>
                    </label>
                    <Button
                      onClick={() => {
                        const batch = selected.map(
                          (id) =>
                            ({
                              id: `bulk:${id}`,
                              kind: module === 'players' ? 'player' : 'club',
                              operation: 'edit',
                              targetId: id,
                              label: `Atualização em massa · ${id}`,
                              summary: 'Provenance revisada no Data Studio',
                              patches: [],
                              asset: null,
                            }) as CommunityChange,
                        );
                        onBatch(batch);
                      }}
                      variant="secondary"
                    >
                      Revisar diff do lote
                    </Button>
                  </>
                )}
              </aside>
            </div>
            {entityModule && (
              <div className="studio-guided-editor">
                <CommunityEntityEditor author={author} onUpsert={onUpsert} world={world} />
              </div>
            )}
          </section>
        )}

        {[
          'staff',
          'seasons',
          'contracts',
          'registrations',
          'translations',
          'patches',
          'advanced',
        ].includes(module) && (
          <section className="studio-empty-module">
            <span>{modules.find(([id]) => id === module)?.[1]}</span>
            <h2>Estrutura pronta para autoria</h2>
            <p>Use importação CSV ou crie a entidade relacionada sem sair do projeto atual.</p>
            <div>
              <Button onClick={() => setModule('import')} variant="primary">
                Importar
              </Button>
              {module === 'seasons' && (
                <Button onClick={() => setModule('competitions')} variant="secondary">
                  Abrir Competition Builder
                </Button>
              )}
            </div>
            <ul>
              {changes
                .filter((change) =>
                  labelFor(change.kind).toLowerCase().startsWith(module.slice(0, -1)),
                )
                .map((change) => (
                  <li key={change.id}>
                    <strong>{change.label}</strong>
                    <span>{change.summary}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
