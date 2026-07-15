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
  footballIconMetadata,
  genericIconMetadata,
  type FootballIconName,
  type GenericIconName,
  type IconSize,
} from '@rivallo/icons';
import { useState, type ReactNode } from 'react';

import { DenseTable } from '../ui/DenseTable/DenseTable.js';
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

function FootballIconProof({
  name,
  meaning,
  version,
}: {
  readonly name: FootballIconName;
  readonly meaning: string;
  readonly version: string;
}) {
  return (
    <div className="ui-lab-icon-row">
      <strong>{`${name} · ${meaning}`}</strong>
      <div className="ui-lab-icon-sizes">
        {iconSizes.map((size) => (
          <span data-icon-proof={`${name}-${size}`} key={size}>
            <FootballIcon name={name} size={size} />
            <small>{size}</small>
          </span>
        ))}
      </div>
      <span>{`SVG original Rivallo · versão ${version}`}</span>
    </div>
  );
}

export function IconSpecimen() {
  return (
    <div className="ui-lab-icon-catalog">
      {genericIcons.map(([name, metadata]) => (
        <GenericIconProof key={name} meaning={metadata.meaning} name={name} />
      ))}
      {footballIcons.map(([name, metadata]) => (
        <FootballIconProof
          key={name}
          meaning={metadata.meaning}
          name={name}
          version={metadata.version}
        />
      ))}
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
  return (
    <DenseTable
      caption="DenseTable de evidência"
      columns={denseTableEvidenceColumns}
      content={{ kind: 'ready', rows: denseTableEvidenceRows }}
      getRowActions={() => ({
        primary: { label: 'Abrir evidência', onSelect: () => undefined },
        secondary: [{ id: 'compare', label: 'Comparar evidência', onSelect: () => undefined }],
      })}
      getRowLabel={(row) => row.name}
      label="Tabela densa configurável"
      selectable
      stickyHeader
    />
  );
}

export function AccessibilityEvidenceSpecimen() {
  return (
    <div className="ui-lab-accessibility-evidence">
      <Status variant="info">Estado identificado por ícone e texto, nunca apenas por cor.</Status>
      <p tabIndex={0}>
        Este texto recebe foco para comprovar ordem, contorno e leitura por teclado.
      </p>
      <p>Movimento reduzido substitui transições não essenciais por resposta instantânea.</p>
    </div>
  );
}

export function ShellProofSpecimen() {
  return (
    <div className="ui-lab-shell-placeholder">
      <Icon name="collapse-navigation" />
      <p>Composição estrutural local; não representa navegação de produto.</p>
    </div>
  );
}
