import { useState, type ComponentType, type CSSProperties } from 'react';

import {
  AccessibilityEvidenceSpecimen,
  DenseTableSpecimen,
  IconSpecimen,
  PrimitiveSpecimen,
  SemanticTokenSpecimen,
  ShellProofSpecimen,
  TypographySpecimen,
} from './specimens.js';
import './UiLab.css';

const categories = [
  {
    id: 'semantic-tokens',
    label: 'Semantic tokens',
    purpose: 'Valores, pares e contraste da linguagem visual.',
    Specimen: SemanticTokenSpecimen,
  },
  {
    id: 'typography',
    label: 'Typography',
    purpose: 'Escala operacional e restrições de uso tipográfico.',
    Specimen: TypographySpecimen,
  },
  {
    id: 'icons',
    label: 'Icons',
    purpose: 'Família genérica e símbolos originais de futebol.',
    Specimen: IconSpecimen,
  },
  {
    id: 'primitives',
    label: 'Primitives',
    purpose: 'Estados reais dos controles compartilhados.',
    Specimen: PrimitiveSpecimen,
  },
  {
    id: 'dense-table',
    label: 'DenseTable',
    purpose: 'Densidade, configuração e leitura de dados.',
    Specimen: DenseTableSpecimen,
  },
  {
    id: 'accessibility',
    label: 'Accessibility evidence',
    purpose: 'Evidências de teclado, foco, contraste e movimento.',
    Specimen: AccessibilityEvidenceSpecimen,
  },
  {
    id: 'shell-proof',
    label: 'Shell proof',
    purpose: 'Composição estrutural expandida e recolhida.',
    Specimen: ShellProofSpecimen,
  },
] as const satisfies readonly {
  readonly id: string;
  readonly label: string;
  readonly purpose: string;
  readonly Specimen: ComponentType;
}[];

type CategoryId = (typeof categories)[number]['id'];

const viewportPresets = [
  { id: '1366x768', label: '1366×768', width: 1366, height: 768 },
  { id: '1920x1080', label: '1920×1080', width: 1920, height: 1080 },
  { id: '2560x1080', label: '2560×1080', width: 2560, height: 1080 },
] as const;

type ViewportPresetId = (typeof viewportPresets)[number]['id'];
type PreviewStyle = CSSProperties & {
  '--ui-lab-preview-width': string;
  '--ui-lab-preview-height': string;
};

export function UiLab() {
  const [activeCategoryId, setActiveCategoryId] = useState<CategoryId>('semantic-tokens');
  const [viewportPresetId, setViewportPresetId] = useState<ViewportPresetId>('1920x1080');
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const viewportPreset =
    viewportPresets.find((preset) => preset.id === viewportPresetId) ?? viewportPresets[1];
  const ActiveSpecimen = activeCategory.Specimen;
  const previewStyle: PreviewStyle = {
    '--ui-lab-preview-width': `${viewportPreset.width}px`,
    '--ui-lab-preview-height': `${viewportPreset.height}px`,
  };

  return (
    <main aria-labelledby="ui-lab-title" className="ui-lab">
      <header className="ui-lab__masthead">
        <div>
          <p className="ui-lab__working-mark">Rivallo · Design foundation V0</p>
          <h1 id="ui-lab-title">UI Lab Rivallo</h1>
          <p>Inspeção determinística da fundação visual em desenvolvimento.</p>
        </div>
        <p className="ui-lab__north-star">Sala de comando sob os refletores</p>
      </header>

      <div className="ui-lab__body">
        <nav aria-label="Categorias do UI Lab" className="ui-lab__navigation">
          {categories.map((category) => {
            const active = category.id === activeCategory.id;
            return (
              <button
                aria-current={active ? 'page' : undefined}
                className="ui-lab__navigation-item"
                data-selected={active || undefined}
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                type="button"
              >
                {category.label}
              </button>
            );
          })}
        </nav>

        <section aria-labelledby={`${activeCategory.id}-title`} className="ui-lab__workspace">
          <header className="ui-lab__category-header">
            <h2 id={`${activeCategory.id}-title`}>{activeCategory.label}</h2>
            <p>{activeCategory.purpose}</p>
          </header>
          <div className="ui-lab__preview-scroll">
            <div
              aria-label={`Quadro de inspeção ${viewportPreset.label}`}
              className="ui-lab__preview-frame"
              data-category={activeCategory.id}
              data-testid="viewport-preview"
              data-viewport={viewportPreset.id}
              style={previewStyle}
            >
              <div className="ui-lab__preview-label">
                <strong>{viewportPreset.label}</strong>
                <span>Evidência de layout, não emulação de dispositivo.</span>
              </div>
              <div className="ui-lab__specimen-canvas">
                <ActiveSpecimen />
              </div>
            </div>
          </div>

          <fieldset className="ui-lab__viewport-controls">
            <legend>Resolução de inspeção</legend>
            <div>
              {viewportPresets.map((preset) => (
                <label key={preset.id}>
                  <input
                    checked={preset.id === viewportPreset.id}
                    name="ui-lab-viewport"
                    onChange={() => setViewportPresetId(preset.id)}
                    type="radio"
                    value={preset.id}
                  />
                  <span>{preset.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="ui-lab__evidence-note">
            Evidência local e reiniciável. Nenhuma configuração desta área é persistida.
          </p>
        </section>
      </div>
    </main>
  );
}
