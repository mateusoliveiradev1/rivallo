import { Status } from '../ui/primitives/feedback.js';
import type { PackageValidationReport } from './types.js';

export function PackageValidationSummary({ report }: { readonly report: PackageValidationReport }) {
  if (report.valid && report.diagnostics.length === 0) {
    return (
      <Status headingLevel={2} label="Pacote válido" variant="positive">
        <p>Schema, IDs, referências, compatibilidade, assets e patches passaram na validação.</p>
      </Status>
    );
  }

  return (
    <section aria-labelledby="validation-heading" className="package-validation-summary">
      <Status
        headingLevel={2}
        label={report.valid ? 'Pacote válido com alertas' : 'Correções necessárias'}
        labelId="validation-heading"
        variant={report.valid ? 'warning' : 'danger'}
      >
        <p>
          {report.diagnostics.length}{' '}
          {report.diagnostics.length === 1 ? 'diagnóstico encontrado' : 'diagnósticos encontrados'}.
          Nenhum conteúdo inválido foi ativado.
        </p>
      </Status>

      <ol className="package-diagnostic-list">
        {report.diagnostics.map((diagnostic, index) => (
          <li key={`${diagnostic.code}:${diagnostic.file}:${index}`}>
            <div className="package-diagnostic-list__heading">
              <strong>{diagnostic.code}</strong>
              <span data-severity={diagnostic.severity}>
                {diagnostic.blocking ? 'Bloqueia ativação' : 'Alerta'}
              </span>
            </div>
            <p>{diagnostic.rule}</p>
            <dl>
              <div>
                <dt>Arquivo</dt>
                <dd>{diagnostic.file}</dd>
              </div>
              {diagnostic.entityId && (
                <div>
                  <dt>Entidade</dt>
                  <dd>{diagnostic.entityId}</dd>
                </div>
              )}
              {diagnostic.field && (
                <div>
                  <dt>Campo</dt>
                  <dd>{diagnostic.field}</dd>
                </div>
              )}
              {diagnostic.reference && (
                <div>
                  <dt>Referência</dt>
                  <dd>{diagnostic.reference}</dd>
                </div>
              )}
              {diagnostic.invalidValue && (
                <div>
                  <dt>Valor</dt>
                  <dd>{diagnostic.invalidValue}</dd>
                </div>
              )}
            </dl>
            {diagnostic.suggestion && (
              <p className="package-diagnostic-list__suggestion">
                <strong>Como corrigir:</strong> {diagnostic.suggestion}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
