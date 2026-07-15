import { useState, type ComponentType } from 'react';

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

export function UiLab() {
  const [activeCategoryId, setActiveCategoryId] = useState<CategoryId>('semantic-tokens');
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const ActiveSpecimen = activeCategory.Specimen;

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
          <div className="ui-lab__specimen-canvas">
            <ActiveSpecimen />
          </div>
          <p className="ui-lab__evidence-note">
            Evidência local e reiniciável. Nenhuma configuração desta área é persistida.
          </p>
        </section>
      </div>
    </main>
  );
}
