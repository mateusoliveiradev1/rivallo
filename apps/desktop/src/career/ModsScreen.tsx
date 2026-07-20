import { Icon } from '@rivallo/icons';

import { MenuShell } from './MenuShell.js';
import type { DataPackageCatalogEntry } from '../data-editor/types.js';

interface ModsScreenProps {
  readonly catalog: readonly DataPackageCatalogEntry[];
  readonly onBack: () => void;
}

export function ModsScreen({ catalog, onBack }: ModsScreenProps) {
  const bases = catalog.filter((entry) => entry.manifest.contentType === 'base');
  const mods = catalog.filter((entry) => entry.manifest.contentType === 'mod');
  return (
    <MenuShell
      description="O catálogo é global; uma carreira só ativa pacotes durante a criação."
      onBack={onBack}
      title="Bases e mods instalados"
    >
      <div className="mods-catalog">
        <section aria-labelledby="bases-title">
          <header>
            <h2 id="bases-title">Bases</h2>
            <span>{bases.length}</span>
          </header>
          {bases.map((entry) => (
            <PackageRow entry={entry} key={entry.manifest.packageId} />
          ))}
        </section>
        <section aria-labelledby="mods-title">
          <header>
            <h2 id="mods-title">Mods</h2>
            <span>{mods.length}</span>
          </header>
          {mods.length === 0 ? (
            <div className="mods-empty">
              <Icon name="workspace" size={24} />
              <div>
                <strong>Nenhum mod instalado</strong>
                <p>Exporte um pacote válido pelo Editor de Dados para vê-lo aqui.</p>
              </div>
            </div>
          ) : (
            mods.map((entry) => <PackageRow entry={entry} key={entry.manifest.packageId} />)
          )}
        </section>
      </div>
    </MenuShell>
  );
}

function PackageRow({ entry }: { readonly entry: DataPackageCatalogEntry }) {
  const blocking = entry.validation.diagnostics.filter((diagnostic) => diagnostic.blocking).length;
  return (
    <article className="package-row">
      <div>
        <span>{entry.manifest.contentType === 'base' ? 'Base de mundo' : 'Mod de dados'}</span>
        <h3>{entry.manifest.name}</h3>
        <p>{entry.manifest.description}</p>
      </div>
      <dl>
        <div>
          <dt>Versão</dt>
          <dd>{entry.manifest.version}</dd>
        </div>
        <div>
          <dt>Schema</dt>
          <dd>{entry.manifest.schemaVersion}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>{entry.manifest.provenance?.source ?? entry.manifest.author}</dd>
        </div>
      </dl>
      <span data-package-status={blocking > 0 ? 'blocked' : 'ready'}>
        {blocking > 0
          ? `${blocking} bloqueios`
          : entry.active
            ? 'Base atual'
            : 'Pronto para seleção'}
      </span>
      <details>
        <summary>Detalhes técnicos</summary>
        <code>{entry.manifest.packageId}</code>
        <p>{entry.manifest.gameVersionCompatibility}</p>
        {(entry.manifest.dependencies ?? []).map((dependency) => (
          <small key={dependency.packageId}>
            Depende de {dependency.packageId} {dependency.versionRequirement}
          </small>
        ))}
      </details>
    </article>
  );
}
