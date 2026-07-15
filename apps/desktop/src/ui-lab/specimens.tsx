import {
  colorTokens,
  contrastPairs,
  measureContrastPairs,
  publicTokenEntries,
  resolveColor,
  typographyTokens,
} from '@rivallo/design-tokens';
import {
  FootballIcon,
  Icon,
  footballIconGrammar,
  footballIconMetadata,
  genericIconMetadata,
  type FootballIconName,
  type GenericIconName,
  type IconSize,
} from '@rivallo/icons';
import { useState, type ReactNode } from 'react';

import {
  DenseTable,
  type DenseTableContent,
  type DenseTableDensity,
} from '../ui/DenseTable/DenseTable.js';
import { denseTableEvidenceColumns, denseTableEvidenceRows } from '../ui/DenseTable/fixtures.js';
import { Button, IconButton } from '../ui/primitives/actions.js';
import { AlertDialogProof, Dialog } from '../ui/primitives/dialogs.js';
import { Menu, Popover, Tooltip } from '../ui/primitives/disclosure.js';
import { EmptyState, ErrorState, Skeleton, Status } from '../ui/primitives/feedback.js';
import { Checkbox, RadioGroup, Select, TextField } from '../ui/primitives/forms.js';
import { Pagination, ScrollArea } from '../ui/primitives/layout.js';
import { Switch, Tabs } from '../ui/primitives/selection.js';
import { Toast } from '../ui/primitives/toast.js';

const contrastEvidence = measureContrastPairs(contrastPairs, colorTokens);
const iconSizes: readonly IconSize[] = [16, 20, 24];
const genericIcons = Object.entries(genericIconMetadata) as readonly [
  GenericIconName,
  { readonly meaning: string },
][];
const footballIcons = Object.entries(footballIconMetadata) as readonly [
  FootballIconName,
  { readonly meaning: string; readonly version: string },
][];
const navigationReferenceNames = [
  'workspace',
  'people',
  'schedule',
  'settings',
] as const satisfies readonly GenericIconName[];
const footballOpticalReferences = {
  'football-ball': 'information',
  'goal-frame': 'workspace',
  'training-cone': 'warning',
} as const satisfies Record<FootballIconName, GenericIconName>;
const iconSurfaces = ['canvas', 'raised'] as const;
const iconExtensionCases = [
  {
    id: 'training',
    area: 'Treinamento',
    owner: 'Contrato da tela de treinamento',
    meaning: 'Distinguir carga, sessão e foco de desenvolvimento.',
    ambiguity: 'Cone isolado não diferencia atividade, intensidade ou objetivo.',
    fallback: 'Usar rótulo operacional completo até cada significado ser aprovado.',
  },
  {
    id: 'tactics',
    area: 'Tática',
    owner: 'Contrato da tela tática',
    meaning: 'Distinguir formação, função, instrução e familiaridade.',
    ambiguity: 'Setas e campos genéricos podem sugerir ações ou estados diferentes.',
    fallback: 'Usar texto explícito para a decisão tática e seu estado.',
  },
  {
    id: 'scouting',
    area: 'Observação',
    owner: 'Contrato da tela de scouting',
    meaning: 'Distinguir busca, atribuição, cobertura e confiança do relatório.',
    ambiguity: 'Busca universal não representa sozinha conhecimento ou descoberta.',
    fallback: 'Manter o estágio do relatório visível por texto.',
  },
  {
    id: 'medicine',
    area: 'Medicina',
    owner: 'Contrato da tela médica',
    meaning: 'Distinguir condição, avaliação, recuperação e disponibilidade.',
    ambiguity: 'Símbolo médico isolado pode confundir estado, ação e severidade.',
    fallback: 'Exibir condição e impacto em texto, nunca apenas por cor ou símbolo.',
  },
] as const;

export function SemanticTokenSpecimen() {
  return (
    <div className="ui-lab-specimen">
      <div aria-label="Catálogo de tokens" className="ui-lab-token-catalog">
        {publicTokenEntries.map((entry) => {
          const isColor = entry.token in colorTokens;
          const resolved = isColor ? resolveColor(entry.value).hex : entry.value;
          return (
            <div className="ui-lab-token" key={`${entry.group}-${entry.token}`}>
              {isColor && (
                <span
                  aria-hidden="true"
                  className="ui-lab-token__swatch"
                  style={{ background: `var(--rv-${entry.token})` }}
                />
              )}
              <strong>{entry.token}</strong>
              <code>{entry.value}</code>
              <span>{resolved}</span>
            </div>
          );
        })}
      </div>

      <ScrollArea label="Evidência tabular de contraste">
        <table className="ui-lab-evidence-table">
          <caption>Evidência de tokens semânticos</caption>
          <thead>
            <tr>
              <th scope="col">Par aprovado</th>
              <th scope="col">Valor authored</th>
              <th scope="col">Valor resolved</th>
              <th scope="col">Razão / limite</th>
              <th scope="col">Uso</th>
            </tr>
          </thead>
          <tbody>
            {contrastEvidence.map((evidence) => (
              <tr key={evidence.name}>
                <td>{evidence.name}</td>
                <td>
                  <code>{`${evidence.foregroundAuthored} / ${evidence.backgroundAuthored}`}</code>
                </td>
                <td>
                  <code>{`${evidence.foregroundResolved} / ${evidence.backgroundResolved}`}</code>
                </td>
                <td>{`${evidence.ratio.toFixed(2)} / ${evidence.threshold.toFixed(1)}`}</td>
                <td>
                  {evidence.kind === 'normal-text' ? 'Texto operacional' : 'Limite não textual'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

export function TypographySpecimen() {
  return (
    <div className="ui-lab-specimen">
      <div className="ui-lab-type-context">
        <strong>Inter operacional</strong>
        <span>Labels, controles, tabelas e dados usam a mesma voz precisa.</span>
        <strong className="ui-lab-type-context__title">Space Grotesk — uso restrito</strong>
        <span className="ui-lab-tabular">12.345.678</span>
      </div>
      <div aria-label="Catálogo tipográfico isolado" className="ui-lab-type-catalog">
        {Object.entries(typographyTokens.sizes).map(([token, [size, lineHeight]]) => (
          <div
            className="ui-lab-type-row"
            data-type-token={token}
            key={token}
            style={{ fontSize: size, lineHeight }}
          >
            <code>{token}</code>
            <span>Precisão operacional em português — {size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenericIconProof({
  name,
  meaning,
}: {
  readonly name: GenericIconName;
  readonly meaning: string;
}) {
  return (
    <div className="ui-lab-icon-row">
      <strong>{`${name} · ${meaning}`}</strong>
      <div className="ui-lab-icon-sizes">
        {iconSizes.map((size) => (
          <span data-icon-proof={`${name}-${size}`} key={size}>
            <Icon name={name} size={size} />
            <small>{size}</small>
          </span>
        ))}
      </div>
      <span>Decorativo por padrão; significado pertence ao controle.</span>
    </div>
  );
}

function NavigationReferenceProof({ name }: { readonly name: GenericIconName }) {
  const metadata = genericIconMetadata[name];

  return (
    <li className="ui-lab-navigation-reference" data-navigation-reference={name}>
      <span aria-hidden="true" className="ui-lab-icon-cell">
        <Icon name={name} size={20} />
      </span>
      <span>
        <strong>{name}</strong>
        <small>{metadata.meaning}</small>
      </span>
    </li>
  );
}

function FootballIconProof({
  name,
  meaning,
  version,
}: {
  readonly name: FootballIconName;
  readonly meaning: string;
  readonly version: string;
}) {
  const opticalReference = footballOpticalReferences[name];

  return (
    <article className="ui-lab-football-review" data-football-review={name}>
      <div className="ui-lab-football-review__metadata">
        <strong>{`${name} · ${meaning}`}</strong>
        <dl>
          <div>
            <dt>Família</dt>
            <dd>Rivallo football</dd>
          </div>
          <div>
            <dt>Versão</dt>
            <dd>{version}</dd>
          </div>
          <div>
            <dt>Comportamento</dt>
            <dd>Decorativo por padrão; semântico exige nome acessível.</dd>
          </div>
          <div>
            <dt>Referência óptica</dt>
            <dd>{`${opticalReference} · ${genericIconMetadata[opticalReference].meaning}`}</dd>
          </div>
        </dl>
      </div>
      <div className="ui-lab-football-review__comparisons">
        {iconSizes.flatMap((size) =>
          iconSurfaces.map((surface) => (
            <div
              className="ui-lab-icon-comparison"
              data-icon-size={size}
              data-icon-surface={surface}
              key={`${size}-${surface}`}
            >
              <small>{`${size}px · ${surface === 'canvas' ? 'canvas graphite' : 'raised graphite'}`}</small>
              <div className="ui-lab-icon-comparison__pair">
                <span
                  aria-label={`${name}, ${size}px, ${surface}`}
                  className="ui-lab-icon-cell"
                  data-icon-proof={`${name}-${size}-${surface}`}
                  data-icon-review-cell={`${name}-${size}-${surface}-football`}
                  role="img"
                >
                  <FootballIcon name={name} size={size} />
                </span>
                <span
                  aria-label={`${opticalReference}, ${size}px, ${surface}`}
                  className="ui-lab-icon-cell"
                  data-icon-review-cell={`${name}-${size}-${surface}-reference`}
                  role="img"
                >
                  <Icon name={opticalReference} size={size} />
                </span>
              </div>
              <small>Rivallo / Lucide</small>
            </div>
          )),
        )}
      </div>
    </article>
  );
}

export function IconSpecimen() {
  return (
    <div className="ui-lab-icon-review">
      <section aria-labelledby="generic-icon-heading" className="ui-lab-icon-section">
        <div className="ui-lab-icon-section__header">
          <div>
            <h3 id="generic-icon-heading">Família universal e referências de navegação</h3>
            <p>
              Lucide é a única fonte genérica. Os quatro exemplos abaixo demonstram vocabulário, não
              destinos ou um menu de produto.
            </p>
          </div>
          <span>16 / 20 / 24px · 1.75px · currentColor</span>
        </div>
        <ul
          aria-label="Referências universais de navegação"
          className="ui-lab-navigation-references"
        >
          {navigationReferenceNames.map((name) => (
            <NavigationReferenceProof key={name} name={name} />
          ))}
        </ul>
        <div aria-label="Inventário genérico completo" className="ui-lab-generic-icon-inventory">
          {genericIcons.map(([name, metadata]) => (
            <GenericIconProof key={name} meaning={metadata.meaning} name={name} />
          ))}
        </div>
      </section>

      <section aria-labelledby="football-icon-heading" className="ui-lab-icon-section">
        <div className="ui-lab-icon-section__header">
          <div>
            <h3 id="football-icon-heading">Comparador óptico Rivallo</h3>
            <p>
              Os três SVGs existentes são comparados com referências Lucide no mesmo tamanho e nas
              duas superfícies canônicas.
            </p>
          </div>
        </div>
        <div
          className="ui-lab-football-grammar"
          data-master-grid={footballIconGrammar.masterGrid}
          data-optical-padding={footballIconGrammar.opticalPadding}
          data-stroke-width={footballIconGrammar.strokeWidth}
          data-testid="football-icon-grammar"
        >
          <strong>Gramática executável</strong>
          <span>{`Grid ${footballIconGrammar.masterGrid} · 16 / 20 / 24px · ${footballIconGrammar.strokeWidth}px · ${footballIconGrammar.color} · padding ${footballIconGrammar.opticalPadding}`}</span>
          <span>{`Máximo ${footballIconGrammar.detailCeiling.elements} elementos e ${footballIconGrammar.detailCeiling.pathCommands} comandos por path.`}</span>
        </div>
        <div className="ui-lab-football-catalog">
          {footballIcons.map(([name, metadata]) => (
            <FootballIconProof
              key={name}
              meaning={metadata.meaning}
              name={name}
              version={metadata.version}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="extension-icon-heading" className="ui-lab-icon-section">
        <div className="ui-lab-icon-section__header">
          <div>
            <h3 id="extension-icon-heading">Rubrica de extensão por contrato</h3>
            <p>
              Casos de avaliação somente textuais. Nenhum SVG ou destino de produto é criado antes
              de a tela responsável aprovar um significado inequívoco.
            </p>
          </div>
        </div>
        <ScrollArea label="Rubrica de extensão da iconografia">
          <table className="ui-lab-extension-table">
            <caption>Critérios para futuros conceitos de domínio</caption>
            <thead>
              <tr>
                <th scope="col">Área</th>
                <th scope="col">Contrato responsável</th>
                <th scope="col">Significado pretendido</th>
                <th scope="col">Ambiguidade e fallback</th>
                <th scope="col">Aprovação</th>
              </tr>
            </thead>
            <tbody>
              {iconExtensionCases.map((extensionCase) => (
                <tr data-extension-case={extensionCase.id} key={extensionCase.id}>
                  <th scope="row">{extensionCase.area}</th>
                  <td>{extensionCase.owner}</td>
                  <td>{extensionCase.meaning}</td>
                  <td>{`${extensionCase.ambiguity} ${extensionCase.fallback}`}</td>
                  <td>Geometria não autorizada · texto obrigatório</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </section>
    </div>
  );
}

function PrimitiveRow({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  return (
    <section className="ui-lab-primitive-row" data-primitive-name={name}>
      <h3>{name}</h3>
      <div>{children}</div>
    </section>
  );
}

export function PrimitiveSpecimen() {
  const [applied, setApplied] = useState(false);
  const [radio, setRadio] = useState('default');
  const [switched, setSwitched] = useState(false);
  const [menuChecked, setMenuChecked] = useState(true);
  const [page, setPage] = useState(1);

  return (
    <div className="ui-lab-primitive-catalog">
      <PrimitiveRow name="Button">
        <Button onClick={() => setApplied(true)} variant="primary">
          Aplicar estado
        </Button>
        <Button variant="secondary">Secundária</Button>
        <Button variant="quiet">Discreta</Button>
        <Button loading>Carregando</Button>
        <span aria-live="polite">
          {applied ? 'Estado aplicado localmente.' : 'Estado não aplicado.'}
        </span>
      </PrimitiveRow>
      <PrimitiveRow name="IconButton">
        <IconButton
          accessibleLabel="Configurar colunas de exemplo"
          icon="columns"
          stablePosition
          tooltip="Configurar colunas de exemplo"
        />
        <IconButton accessibleLabel="Ação indisponível" disabled icon="more-actions" />
      </PrimitiveRow>
      <PrimitiveRow name="TextField">
        <TextField helperText="Ajuda associada ao campo." label="Nome da evidência" />
        <TextField error="Informe um valor válido." label="Campo com erro" />
      </PrimitiveRow>
      <PrimitiveRow name="Select">
        <Select
          label="Estado observado"
          options={[
            { value: 'default', label: 'Padrão' },
            { value: 'loading', label: 'Carregando' },
          ]}
        />
      </PrimitiveRow>
      <PrimitiveRow name="Checkbox">
        <Checkbox checked={false} label="Exemplo não marcado" onCheckedChange={() => undefined} />
        <Checkbox checked label="Exemplo marcado" onCheckedChange={() => undefined} />
        <Checkbox
          checked="indeterminate"
          error="Este grupo contém um erro de demonstração."
          label="Exemplo parcialmente marcado"
          onCheckedChange={() => undefined}
        />
        <Checkbox
          checked={false}
          disabled
          label="Exemplo indisponível"
          onCheckedChange={() => undefined}
        />
      </PrimitiveRow>
      <PrimitiveRow name="RadioGroup">
        <RadioGroup
          label="Estado da amostra"
          onValueChange={setRadio}
          options={[
            { value: 'default', label: 'Padrão' },
            { value: 'selected', label: 'Selecionado' },
            { value: 'disabled', label: 'Indisponível', disabled: true },
          ]}
          value={radio}
        />
      </PrimitiveRow>
      <PrimitiveRow name="Switch">
        <Switch checked={switched} label="Evidência ativa" onCheckedChange={setSwitched} />
      </PrimitiveRow>
      <PrimitiveRow name="Tabs">
        <Tabs
          defaultValue="first"
          label="Abas de evidência"
          items={[
            { value: 'first', label: 'Primeira', content: 'Painel inicial.' },
            { value: 'second', label: 'Segunda', content: 'Painel alternativo.' },
          ]}
        />
      </PrimitiveRow>
      <PrimitiveRow name="Tooltip">
        <Tooltip content="Descrição suplementar">
          <button className="rv-button" data-variant="secondary" type="button">
            Focar para descrever
          </button>
        </Tooltip>
      </PrimitiveRow>
      <PrimitiveRow name="Popover">
        <Popover title="Contexto local" triggerLabel="Abrir contexto">
          Conteúdo não modal de demonstração.
        </Popover>
      </PrimitiveRow>
      <PrimitiveRow name="Menu">
        <Menu
          triggerLabel="Ações de demonstração"
          items={[
            { id: 'command', type: 'command', label: 'Comando local' },
            {
              id: 'checked',
              type: 'checkbox',
              label: 'Opção marcada',
              checked: menuChecked,
              onCheckedChange: setMenuChecked,
            },
            { id: 'disabled', type: 'command', label: 'Comando indisponível', disabled: true },
          ]}
        />
      </PrimitiveRow>
      <PrimitiveRow name="Dialog">
        <Dialog
          description="Interrupção controlada somente para inspeção."
          title="Diálogo de evidência"
          triggerLabel="Abrir diálogo"
        >
          <TextField label="Campo dentro do diálogo" />
        </Dialog>
      </PrimitiveRow>
      <PrimitiveRow name="AlertDialog">
        <AlertDialogProof triggerLabel="Abrir confirmação" />
      </PrimitiveRow>
      <PrimitiveRow name="Toast">
        <Toast
          durationMs={60_000}
          message="Feedback breve sem condição persistente."
          title="Amostra atualizada"
        />
      </PrimitiveRow>
      <PrimitiveRow name="Status">
        <Status variant="info">Informação persistente com texto e ícone.</Status>
        <Status variant="danger">Condição crítica explícita.</Status>
      </PrimitiveRow>
      <PrimitiveRow name="Skeleton">
        <Skeleton lines={3} />
      </PrimitiveRow>
      <PrimitiveRow name="Empty State">
        <EmptyState />
      </PrimitiveRow>
      <PrimitiveRow name="Error State">
        <ErrorState />
      </PrimitiveRow>
      <PrimitiveRow name="Pagination">
        <Pagination currentPage={page} onPageChange={setPage} totalPages={3} />
      </PrimitiveRow>
      <PrimitiveRow name="ScrollArea">
        <ScrollArea label="Exemplo de conteúdo extenso">
          <p>Conteúdo largo permanece acessível por rolagem nativa.</p>
        </ScrollArea>
      </PrimitiveRow>
    </div>
  );
}

export function DenseTableSpecimen() {
  const [density, setDensity] = useState<DenseTableDensity>('compact');
  const [contentState, setContentState] = useState<'ready' | 'loading' | 'empty' | 'error'>(
    'ready',
  );
  const [columnPriority, setColumnPriority] = useState('3');
  const content: DenseTableContent<(typeof denseTableEvidenceRows)[number]> =
    contentState === 'ready'
      ? { kind: 'ready', rows: denseTableEvidenceRows }
      : contentState === 'loading'
        ? { kind: 'loading', rowCount: 5 }
        : { kind: contentState };

  return (
    <div className="ui-lab-dense-table-specimen">
      <DenseTable
        caption="DenseTable de evidência"
        columnPriorityLimit={Number(columnPriority)}
        columns={denseTableEvidenceColumns}
        content={content}
        density={density}
        getRowActions={() => ({
          primary: { label: 'Abrir evidência', onSelect: () => undefined },
          secondary: [{ id: 'compare', label: 'Comparar evidência', onSelect: () => undefined }],
        })}
        getRowLabel={(row) => row.name}
        label="Tabela densa configurável"
        selectable
        stickyHeader
      />

      <fieldset className="ui-lab-local-controls">
        <legend>Controles locais da DenseTable</legend>
        <Select
          label="Densidade da tabela"
          onChange={(event) => setDensity(event.currentTarget.value as DenseTableDensity)}
          options={[
            { value: 'compact', label: 'Compacta · 32px' },
            { value: 'comfortable', label: 'Confortável · 40px' },
          ]}
          value={density}
        />
        <Select
          label="Estado da tabela"
          onChange={(event) =>
            setContentState(event.currentTarget.value as 'ready' | 'loading' | 'empty' | 'error')
          }
          options={[
            { value: 'ready', label: 'Pronta' },
            { value: 'loading', label: 'Carregando' },
            { value: 'empty', label: 'Vazia' },
            { value: 'error', label: 'Erro' },
          ]}
          value={contentState}
        />
        <Select
          label="Prioridade de colunas"
          onChange={(event) => setColumnPriority(event.currentTarget.value)}
          options={[
            { value: '1', label: 'Somente essenciais' },
            { value: '2', label: 'Essenciais e contexto' },
            { value: '3', label: 'Todas as colunas' },
          ]}
          value={columnPriority}
        />
      </fieldset>
    </div>
  );
}

export function AccessibilityEvidenceSpecimen() {
  return (
    <div className="ui-lab-accessibility-evidence">
      <Status variant="info">
        Informação acompanhada por ícone e texto; a cor não é o único sinal.
      </Status>

      <fieldset className="ui-lab-a11y__keyboard-path">
        <legend>Ordem de teclado demonstrável</legend>
        <Button variant="secondary">Primeiro alvo de teclado</Button>
        <Button variant="secondary">Segundo alvo de teclado</Button>
      </fieldset>

      <p data-testid="visible-focus-proof" tabIndex={0}>
        Foco visível em ciano, com contorno e deslocamento que não dependem da cor de fundo.
      </p>

      <p
        className="ui-lab-a11y__expanded-copy"
        data-testid="long-text-proof"
        data-text-expansion="200"
      >
        Associação Desportiva Vale das Águas Internacional — texto longo ampliado a duzentos por
        cento para provar quebra segura, leitura integral e futura localização.
      </p>

      <p className="ui-lab-a11y__text-spacing" data-testid="text-spacing-proof">
        Espaçamento de texto ampliado preserva palavras, linhas, controles e a ordem de leitura.
      </p>

      <div
        className="ui-lab-a11y__motion-proof"
        data-reduced-motion-supported="true"
        data-testid="reduced-motion-proof"
      >
        <Icon name="information" size={20} />
        <span>
          Movimento reduzido torna a resposta instantânea; nenhuma informação depende da transição.
        </span>
      </div>
    </div>
  );
}

export function ShellProofSpecimen() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleLabel = collapsed ? 'Expandir navegação' : 'Recolher navegação';
  const navigationItems = [
    { label: 'Região de exemplo A', icon: 'search' as const },
    { label: 'Região de exemplo B', icon: 'columns' as const },
    { label: 'Região de exemplo C', icon: 'information' as const },
  ];

  return (
    <div className="ui-lab-shell-proof" data-collapsed={collapsed} data-testid="shell-proof">
      <nav
        aria-label="Composição de navegação"
        className="ui-lab-shell-proof__navigation"
        data-navigation-width={collapsed ? '56' : '232'}
      >
        <IconButton
          accessibleLabel={toggleLabel}
          icon={collapsed ? 'expand-navigation' : 'collapse-navigation'}
          onClick={() => setCollapsed((current) => !current)}
          stablePosition
          tooltip={toggleLabel}
        />
        <div className="ui-lab-shell-proof__items">
          {navigationItems.map((item) => (
            <Tooltip content={item.label} key={item.label}>
              <span
                aria-label={item.label}
                className="ui-lab-shell-proof__item"
                tabIndex={collapsed ? 0 : -1}
              >
                <span data-testid="shell-navigation-icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <span aria-hidden={collapsed || undefined} className="ui-lab-shell-proof__label">
                  {item.label}
                </span>
              </span>
            </Tooltip>
          ))}
        </div>
      </nav>

      <section className="ui-lab-shell-proof__workspace" data-testid="shell-workspace">
        <strong>Área de trabalho preservada</strong>
        <p>
          A largura disponível muda, mas a ordem do conteúdo e o foco permanecem estáveis. Esta
          composição não representa navegação de produto.
        </p>
      </section>
    </div>
  );
}
