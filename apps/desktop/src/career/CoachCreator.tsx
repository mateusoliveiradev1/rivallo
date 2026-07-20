import { useEffect, useMemo, useRef, useState } from 'react';

import {
  defaultPortraitRecipe,
  PortraitAvatar,
  PortraitStudio,
} from '../portrait/PortraitEngine.js';
import { Button } from '../ui/primitives/actions.js';
import { previewCoachCreation } from './client.js';
import type {
  CoachArchetype,
  CoachAttributes,
  CoachBackground,
  CoachCreationEvaluation,
  CoachCreatorDraft,
  WorldNation,
} from './types.js';

const creatorSteps = [
  'Perfil',
  'Visual',
  'Experiência',
  'Capacidades',
  'Preferências',
  'Confirmar',
];

const backgroundOptions: readonly {
  value: CoachBackground;
  label: string;
  description: string;
}[] = [
  {
    value: 'professionalPlayer',
    label: 'Ex-jogador profissional',
    description: 'Mais experiência e reputação, com expectativas iniciais maiores.',
  },
  {
    value: 'amateurPlayer',
    label: 'Ex-jogador amador',
    description: 'Vivência de campo moderada e desenvolvimento equilibrado.',
  },
  {
    value: 'tacticalAnalyst',
    label: 'Analista tático',
    description: 'Leitura de jogo e preparação em destaque.',
  },
  {
    value: 'youthDeveloper',
    label: 'Formador de jovens',
    description: 'Desenvolvimento e comunicação como pontos de partida.',
  },
  {
    value: 'peopleManager',
    label: 'Gestor de pessoas',
    description: 'Motivação, disciplina e gestão humana em primeiro plano.',
  },
  {
    value: 'beginner',
    label: 'Treinador iniciante',
    description: 'Reputação baixa e orçamento mais restrito para uma jornada de crescimento.',
  },
  {
    value: 'balanced',
    label: 'Perfil equilibrado',
    description: 'Sem força dominante; flexível para diferentes projetos.',
  },
];

const attributeMeta: readonly { key: keyof CoachAttributes; label: string; group: string }[] = [
  { key: 'tactical', label: 'Tática', group: 'Campo' },
  { key: 'preparation', label: 'Preparação', group: 'Campo' },
  { key: 'adaptability', label: 'Adaptabilidade', group: 'Campo' },
  { key: 'decisionMaking', label: 'Tomada de decisão', group: 'Campo' },
  { key: 'technicalDevelopment', label: 'Desenvolvimento técnico', group: 'Desenvolvimento' },
  { key: 'physicalDevelopment', label: 'Desenvolvimento físico', group: 'Desenvolvimento' },
  { key: 'mentalDevelopment', label: 'Desenvolvimento mental', group: 'Desenvolvimento' },
  { key: 'tacticalDevelopment', label: 'Ensino tático', group: 'Desenvolvimento' },
  { key: 'youthDevelopment', label: 'Desenvolvimento de jovens', group: 'Desenvolvimento' },
  { key: 'motivation', label: 'Motivação', group: 'Gestão humana' },
  { key: 'communication', label: 'Comunicação', group: 'Gestão humana' },
  { key: 'discipline', label: 'Disciplina', group: 'Gestão humana' },
  { key: 'peopleManagement', label: 'Gestão de pessoas', group: 'Gestão humana' },
  { key: 'abilityJudgement', label: 'Avaliação de capacidade', group: 'Avaliação' },
  { key: 'potentialJudgement', label: 'Avaliação de potencial', group: 'Avaliação' },
];

const baseAttributes = (value = 40): CoachAttributes => ({
  tactical: value,
  preparation: value,
  adaptability: value,
  decisionMaking: value,
  technicalDevelopment: value,
  physicalDevelopment: value,
  mentalDevelopment: value,
  tacticalDevelopment: value,
  youthDevelopment: value,
  motivation: value,
  communication: value,
  discipline: value,
  peopleManagement: value,
  abilityJudgement: value,
  potentialJudgement: value,
});

const portraitDerivativeSizes = {
  profile: 512,
  card: 256,
  miniCard: 128,
  sidebar: 64,
} as const;

const generatePortraitDerivatives = async (file: File) => {
  if (typeof globalThis.createImageBitmap !== 'function') return {};
  const bitmap = await globalThis.createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    const derivatives: Record<string, readonly number[]> = {};
    for (const [name, size] of Object.entries(portraitDerivativeSizes)) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('O recorte da foto não está disponível neste dispositivo.');
      context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, size, size);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error('Não foi possível gerar a foto do card.')),
          'image/png',
        ),
      );
      derivatives[name] = [...new Uint8Array(await blob.arrayBuffer())];
    }
    return derivatives;
  } finally {
    bitmap.close();
  }
};

const capabilityPresets: readonly {
  readonly id: CoachArchetype;
  readonly label: string;
  readonly description: string;
  readonly attributes: CoachAttributes;
}[] = [
  {
    id: 'balanced',
    label: 'Equilibrado',
    description: 'Um ponto de partida seguro, sem uma fraqueza dominante.',
    attributes: baseAttributes(44),
  },
  {
    id: 'strategist',
    label: 'Estrategista',
    description: 'Prioriza leitura de jogo, preparação e decisões.',
    attributes: {
      ...baseAttributes(),
      tactical: 55,
      preparation: 52,
      adaptability: 48,
      decisionMaking: 50,
      tacticalDevelopment: 46,
    },
  },
  {
    id: 'peopleManager',
    label: 'Gestor de pessoas',
    description: 'Investe em motivação, comunicação e gestão humana.',
    attributes: {
      ...baseAttributes(),
      motivation: 52,
      communication: 52,
      discipline: 48,
      peopleManagement: 55,
    },
  },
  {
    id: 'youthDeveloper',
    label: 'Formador de jovens',
    description: 'Favorece evolução técnica, mental e de jovens.',
    attributes: {
      ...baseAttributes(),
      technicalDevelopment: 52,
      mentalDevelopment: 50,
      tacticalDevelopment: 46,
      youthDevelopment: 55,
      communication: 48,
    },
  },
  {
    id: 'analyst',
    label: 'Analista',
    description: 'Concentra leitura de capacidade, potencial e tomada de decisão.',
    attributes: {
      ...baseAttributes(),
      tactical: 46,
      decisionMaking: 48,
      abilityJudgement: 55,
      potentialJudgement: 55,
    },
  },
  {
    id: 'formerPlayer',
    label: 'Ex-jogador',
    description: 'Combina vivência de campo, liderança e desenvolvimento técnico.',
    attributes: {
      ...baseAttributes(),
      decisionMaking: 46,
      technicalDevelopment: 48,
      motivation: 50,
      discipline: 48,
      peopleManagement: 50,
    },
  },
  {
    id: 'matchPreparer',
    label: 'Preparador de partidas',
    description: 'Prioriza preparação, disciplina e decisões para o próximo desafio.',
    attributes: {
      ...baseAttributes(),
      tactical: 52,
      preparation: 55,
      adaptability: 46,
      decisionMaking: 50,
      discipline: 48,
    },
  },
];

export const isCoachDraftReady = (
  draft: CoachCreatorDraft,
  evaluation?: CoachCreationEvaluation | null,
) =>
  draft.firstName.trim().length > 0 &&
  draft.lastName.trim().length > 0 &&
  draft.knownName.trim().length > 0 &&
  draft.age >= 21 &&
  draft.age <= 85 &&
  draft.preferredFormations.length >= 1 &&
  draft.preferredFormations.length <= 3 &&
  draft.specialties.length <= 2 &&
  Object.values(draft.attributes).every((value) => value >= 20 && value <= 70) &&
  (evaluation ? evaluation.valid : true);

export const defaultCoachDraft = (nationality = 'Brasil'): CoachCreatorDraft => ({
  firstName: '',
  lastName: '',
  knownName: '',
  nationality,
  secondaryNationality: null,
  birthplace: null,
  birthDate: '1990-01-01',
  age: 36,
  languages: ['Português'],
  background: 'balanced',
  archetype: 'balanced',
  qualification: 'Licença Nacional',
  experienceYears: 3,
  reputation: 42,
  style: 'Equilibrado',
  preferredFormations: ['4-3-3'],
  specialties: [],
  attributes: baseAttributes(),
  appearance: defaultPortraitRecipe(),
  portrait: null,
});

interface CoachCreatorProps {
  readonly draft: CoachCreatorDraft;
  readonly nations: readonly WorldNation[];
  readonly onChange: (draft: CoachCreatorDraft) => void;
  readonly onEvaluation?: (evaluation: CoachCreationEvaluation | null) => void;
}

function CoachDraftPortrait({
  draft,
  size = 'large',
  decorative = false,
}: {
  readonly draft: CoachCreatorDraft;
  readonly size?: 'large' | 'compact';
  readonly decorative?: boolean;
}) {
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.portrait) {
      setPortraitUrl(null);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(draft.portrait.bytes)], { type: draft.portrait.mimeType }),
    );
    setPortraitUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.portrait]);

  return (
    <div
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Retrato de ${draft.knownName || 'novo treinador'}`}
      className="coach-avatar-preview"
      data-photo={portraitUrl ? true : undefined}
      data-size={size}
      role={decorative ? undefined : 'img'}
    >
      {portraitUrl ? (
        <img alt="" src={portraitUrl} />
      ) : (
        <PortraitAvatar recipe={draft.appearance} />
      )}
    </div>
  );
}

export function CoachCreator({ draft, nations, onChange, onEvaluation }: CoachCreatorProps) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<CoachAttributes[]>([]);
  const [future, setFuture] = useState<CoachAttributes[]>([]);
  const [evaluation, setEvaluation] = useState<CoachCreationEvaluation | null>(null);
  const [portraitError, setPortraitError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const creatorRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0;
    const wizardContent = creatorRef.current?.closest<HTMLElement>('.career-wizard__content');
    if (wizardContent && creatorRef.current) {
      const contentRect = wizardContent.getBoundingClientRect();
      const creatorRect = creatorRef.current.getBoundingClientRect();
      wizardContent.scrollTop += creatorRect.top - contentRect.top - 16;
    }
  }, [step]);
  const background = backgroundOptions.find((option) => option.value === draft.background)!;
  const remaining = evaluation?.remainingPoints ?? null;
  const contextual = evaluation?.contextualRating ?? null;
  const attributeEvaluation = useMemo(
    () => new Map(evaluation?.attributeLines.map((line) => [line.attributeId, line]) ?? []),
    [evaluation],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void previewCoachCreation(draft)
        .then((next) => {
          if (!active) return;
          setEvaluation(next);
          onEvaluation?.(next);
        })
        .catch(() => {
          if (!active) return;
          setEvaluation(null);
          onEvaluation?.(null);
        });
    }, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draft, onEvaluation]);

  const patch = (changes: Partial<CoachCreatorDraft>) => onChange({ ...draft, ...changes });
  const setAttribute = (key: keyof CoachAttributes, value: number) => {
    setHistory((current) => [...current.slice(-9), draft.attributes]);
    setFuture([]);
    patch({ attributes: { ...draft.attributes, [key]: value } });
  };
  const applyCapabilityPreset = (preset: (typeof capabilityPresets)[number]) => {
    setHistory((current) => [...current.slice(-9), draft.attributes]);
    setFuture([]);
    const cap = evaluation?.attributeCap ?? 70;
    patch({
      archetype: preset.id,
      attributes: Object.fromEntries(
        Object.entries(preset.attributes).map(([key, value]) => [key, Math.min(value, cap)]),
      ) as unknown as CoachAttributes,
    });
  };

  const importPortrait = async (file: File | undefined) => {
    setPortraitError('');
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setPortraitError(
        'Use PNG, JPEG ou WebP com até 5 MB. SVG e arquivos remotos não são aceitos.',
      );
      return;
    }
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      if (typeof file.arrayBuffer === 'function') {
        file.arrayBuffer().then(resolve, reject);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('NÃ£o foi possÃ­vel ler a foto.'));
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(file);
    });
    let derivatives: Readonly<Record<string, readonly number[]>>;
    try {
      derivatives = await generatePortraitDerivatives(file);
    } catch (error) {
      setPortraitError(
        error instanceof Error ? error.message : 'Não foi possível preparar a foto para os cards.',
      );
      return;
    }
    patch({
      portrait: {
        fileName: file.name.replace(/[^A-Za-z0-9._-]/gu, '_'),
        mimeType: file.type,
        bytes: [...new Uint8Array(buffer)],
        derivatives,
      },
    });
  };

  const identityValid =
    draft.firstName.trim().length > 0 &&
    draft.lastName.trim().length > 0 &&
    draft.knownName.trim().length > 0 &&
    draft.age >= 21 &&
    draft.age <= 85;
  const stepValid =
    (step !== 0 || identityValid) &&
    (step !== 3 || evaluation?.valid === true) &&
    (step !== 4 ||
      (draft.preferredFormations.length >= 1 &&
        draft.specialties.length <= (evaluation?.specialtyLimit ?? 2)));

  return (
    <div className="coach-creator" ref={creatorRef}>
      <nav aria-label="Etapas do criador de treinador" className="coach-creator__steps">
        {creatorSteps.map((label, index) => (
          <button
            aria-current={index === step ? 'step' : undefined}
            data-complete={index < step || undefined}
            disabled={index > step}
            key={label}
            onClick={() => setStep(index)}
            type="button"
          >
            <span>{index + 1}</span> {label}
          </button>
        ))}
      </nav>

      <section aria-labelledby="coach-stage-title" className="coach-creator__stage" ref={stageRef}>
        {step === 0 && (
          <>
            <header>
              <h3 id="coach-stage-title">Como você quer ser conhecido?</h3>
              <p>
                Comece pelo essencial. Os detalhes pessoais são opcionais e podem ficar para depois.
              </p>
            </header>
            <div className="coach-form-grid">
              <label>
                Nome
                <input
                  autoFocus
                  maxLength={80}
                  onChange={(event) => patch({ firstName: event.target.value })}
                  required
                  value={draft.firstName}
                />
              </label>
              <label>
                Sobrenome
                <input
                  maxLength={80}
                  onChange={(event) => patch({ lastName: event.target.value })}
                  required
                  value={draft.lastName}
                />
              </label>
              <label>
                Nome conhecido
                <input
                  maxLength={80}
                  onChange={(event) => patch({ knownName: event.target.value })}
                  required
                  value={draft.knownName}
                />
              </label>
              <label>
                Nacionalidade
                <select
                  onChange={(event) => patch({ nationality: event.target.value })}
                  value={draft.nationality}
                >
                  {nations.map((nation) => (
                    <option key={nation.id} value={nation.name}>
                      {nation.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Idade
                <input
                  max={85}
                  min={21}
                  onChange={(event) => {
                    const age = Number(event.target.value);
                    patch({ age, birthDate: `${Math.max(1941, 2026 - age)}-01-01` });
                  }}
                  type="number"
                  value={draft.age}
                />
              </label>
            </div>
            <details className="coach-advanced-fields">
              <summary>Adicionar detalhes pessoais</summary>
              <p>Opcional: personalize a biografia sem bloquear a criação.</p>
              <div className="coach-form-grid">
                <label>
                  Data de nascimento
                  <input
                    onChange={(event) => patch({ birthDate: event.target.value })}
                    type="date"
                    value={draft.birthDate}
                  />
                </label>
                <label>
                  Local de nascimento
                  <input
                    maxLength={100}
                    onChange={(event) => patch({ birthplace: event.target.value || null })}
                    value={draft.birthplace ?? ''}
                  />
                </label>
                <label>
                  Idiomas
                  <input
                    onChange={(event) =>
                      patch({
                        languages: event.target.value
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                    value={draft.languages.join(', ')}
                  />
                  <small>Separe mais de um idioma por vírgulas.</small>
                </label>
              </div>
            </details>
            {!identityValid && (
              <p className="field-error">
                Preencha nome, sobrenome, nome conhecido e uma idade entre 21 e 85.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <header>
              <h3 id="coach-stage-title">Aparência</h3>
              <p>
                Crie uma identidade ilustrada original e consistente, ou importe uma foto opcional.
              </p>
            </header>
            <div className="appearance-editor">
              <PortraitStudio
                onChange={(appearance) => patch({ appearance, portrait: null })}
                recipe={draft.appearance}
              />
              <div className="appearance-import-row">
                {draft.portrait && <CoachDraftPortrait draft={draft} size="compact" />}
                <input
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Importar retrato local"
                  className="sr-only"
                  onChange={(event) => void importPortrait(event.target.files?.[0])}
                  ref={fileRef}
                  type="file"
                />
                <Button onClick={() => fileRef.current?.click()} variant="secondary">
                  {draft.portrait ? 'Trocar retrato importado' : 'Importar retrato'}
                </Button>
                {draft.portrait && (
                  <Button onClick={() => patch({ portrait: null })} variant="secondary">
                    Voltar ao avatar criado
                  </Button>
                )}
                <small>PNG, JPEG ou WebP · até 5 MB</small>
              </div>
              {portraitError && <p className="field-error">{portraitError}</p>}
              <p className="appearance-privacy-note">
                A receita e o retrato ficam no save. Nada é enviado para serviços externos.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <header>
              <h3 id="coach-stage-title">Histórico profissional</h3>
              <p>Cada origem define um orçamento e limites transparentes, sem bônus ocultos.</p>
            </header>
            <div
              className="background-options"
              role="radiogroup"
              aria-label="Histórico profissional"
            >
              {backgroundOptions.map((option) => (
                <button
                  aria-checked={draft.background === option.value}
                  key={option.value}
                  onClick={() => patch({ background: option.value })}
                  role="radio"
                  type="button"
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <em>
                    {draft.background === option.value && evaluation
                      ? `${evaluation.budget} pontos · cap ${evaluation.attributeCap}`
                      : 'Limites próprios'}
                  </em>
                </button>
              ))}
            </div>
            <div className="coach-form-grid coach-form-grid--compact">
              <label>
                Licença
                <select
                  onChange={(event) => patch({ qualification: event.target.value })}
                  value={draft.qualification}
                >
                  <option>Licença Regional</option>
                  <option>Licença Nacional</option>
                  <option>Licença Continental</option>
                </select>
              </label>
              <label>
                Anos de experiência
                <input
                  max={evaluation?.experienceCap ?? 30}
                  min={0}
                  onChange={(event) => patch({ experienceYears: Number(event.target.value) })}
                  type="number"
                  value={draft.experienceYears}
                />
                <small>Máximo para este histórico: {evaluation?.experienceCap ?? '—'} anos</small>
              </label>
              <label>
                Reputação inicial
                <input
                  max={evaluation?.reputationCap ?? 70}
                  min={20}
                  onChange={(event) => patch({ reputation: Number(event.target.value) })}
                  type="range"
                  value={draft.reputation}
                />
                <output>{draft.reputation}</output>
                <small>Cap inicial: {evaluation?.reputationCap ?? '—'}</small>
              </label>
            </div>
            {evaluation && !evaluation.valid && (
              <div className="coach-balance-errors" role="alert">
                {evaluation.errors
                  .filter((error) => error.includes('experiência') || error.includes('reputação'))
                  .map((error) => (
                    <p key={error}>{error}</p>
                  ))}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <header className="capability-heading">
              <div>
                <h3 id="coach-stage-title">Capacidades</h3>
                <p>Escolha um perfil pronto. Se quiser, ajuste cada capacidade depois.</p>
              </div>
              <div
                className="points-meter"
                data-negative={remaining !== null && remaining < 0 ? true : undefined}
              >
                <strong>{remaining ?? '—'}</strong>
                <span>pontos restantes</span>
              </div>
            </header>
            <div
              className="capability-presets"
              role="radiogroup"
              aria-label="Perfil rápido de capacidades"
            >
              {capabilityPresets.map((preset) => {
                const selected = attributeMeta.every(
                  ({ key }) => draft.attributes[key] === preset.attributes[key],
                );
                return (
                  <button
                    aria-checked={selected}
                    key={preset.id}
                    onClick={() => applyCapabilityPreset(preset)}
                    role="radio"
                    type="button"
                  >
                    <span>
                      <strong>{preset.label}</strong>
                      <small>{preset.description}</small>
                    </span>
                    {selected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="coach-growth-note">
              <strong>Este é apenas o nível inicial</strong>
              <p>
                Nenhuma capacidade pode começar acima de 70. Pontos fortes exigem escolhas e a
                evolução maior acontece durante a carreira.
              </p>
            </div>
            <details className="advanced-capabilities">
              <summary>Ajustar capacidades individualmente</summary>
              <p>Use os controles abaixo apenas se quiser personalizar o perfil em detalhe.</p>
              <div className="attribute-actions">
                <Button
                  disabled={history.length === 0}
                  onClick={() => {
                    const previous = history.at(-1);
                    if (previous) {
                      setFuture((current) => [draft.attributes, ...current].slice(0, 10));
                      patch({ attributes: previous });
                      setHistory((current) => current.slice(0, -1));
                    }
                  }}
                  variant="secondary"
                >
                  Desfazer
                </Button>
                <Button
                  disabled={future.length === 0}
                  onClick={() => {
                    const next = future[0];
                    if (next) {
                      setHistory((current) => [...current.slice(-9), draft.attributes]);
                      patch({ attributes: next });
                      setFuture((current) => current.slice(1));
                    }
                  }}
                  variant="secondary"
                >
                  Refazer
                </Button>
                <Button
                  onClick={() =>
                    applyCapabilityPreset(
                      capabilityPresets.find((preset) => preset.id === 'balanced')!,
                    )
                  }
                  variant="secondary"
                >
                  Autoequilibrar
                </Button>
                <Button
                  onClick={() => {
                    setHistory((current) => [...current.slice(-9), draft.attributes]);
                    setFuture([]);
                    patch({ archetype: 'balanced', attributes: baseAttributes() });
                  }}
                  variant="secondary"
                >
                  Restaurar valores
                </Button>
              </div>
              <div className="attribute-groups">
                {[...new Set(attributeMeta.map((attribute) => attribute.group))].map((group) => (
                  <fieldset key={group}>
                    <legend>{group}</legend>
                    {attributeMeta
                      .filter((attribute) => attribute.group === group)
                      .map((attribute) => {
                        const line = attributeEvaluation.get(attribute.key);
                        const qualitative =
                          draft.attributes[attribute.key] >= 60
                            ? 'Destaque'
                            : draft.attributes[attribute.key] >= 50
                              ? 'Boa'
                              : draft.attributes[attribute.key] >= 40
                                ? 'Sólida'
                                : 'Em desenvolvimento';
                        return (
                          <label key={attribute.key}>
                            <span>
                              {attribute.label}
                              <small>{qualitative}</small>
                            </span>
                            <input
                              aria-label={attribute.label}
                              max={line?.cap ?? 70}
                              min={20}
                              onChange={(event) =>
                                setAttribute(attribute.key, Number(event.target.value))
                              }
                              type="range"
                              value={draft.attributes[attribute.key]}
                            />
                            <output>{draft.attributes[attribute.key]}</output>
                            <small>
                              Próximo: {line?.nextCost ?? '—'} pt · cap {line?.cap ?? '—'} ·{' '}
                              {draft.attributes[attribute.key] >= 40 ? '+' : ''}
                              {draft.attributes[attribute.key] - 40} inicial
                            </small>
                            {draft.attributes[attribute.key] !== 40 && (
                              <button onClick={() => setAttribute(attribute.key, 40)} type="button">
                                Restaurar
                              </button>
                            )}
                          </label>
                        );
                      })}
                  </fieldset>
                ))}
              </div>
            </details>
            {remaining !== null && remaining < 0 && (
              <p className="field-error">Reduza {Math.abs(remaining)} pontos para continuar.</p>
            )}
            {evaluation && !evaluation.valid && (
              <div className="coach-balance-errors" role="alert">
                {evaluation.errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <header>
              <h3 id="coach-stage-title">Estilo e especialidades</h3>
              <p>Preferências descrevem o treinador; elas não sobrescrevem a tática do clube.</p>
            </header>
            <div className="coach-form-grid">
              <label>
                Estilo
                <select
                  onChange={(event) => patch({ style: event.target.value })}
                  value={draft.style}
                >
                  <option>Equilibrado</option>
                  <option>Protagonista</option>
                  <option>Compacto e reativo</option>
                  <option>Desenvolvimento e posse</option>
                </select>
              </label>
              <fieldset className="choice-fieldset">
                <legend>Formações favoritas — até 3</legend>
                {['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-3-2'].map((formation) => (
                  <label key={formation}>
                    <input
                      checked={draft.preferredFormations.includes(formation)}
                      disabled={
                        !draft.preferredFormations.includes(formation) &&
                        draft.preferredFormations.length >= 3
                      }
                      onChange={(event) =>
                        patch({
                          preferredFormations: event.target.checked
                            ? [...draft.preferredFormations, formation]
                            : draft.preferredFormations.filter((value) => value !== formation),
                        })
                      }
                      type="checkbox"
                    />
                    {formation}
                  </label>
                ))}
              </fieldset>
              <fieldset className="choice-fieldset">
                <legend>Especialidades — até {evaluation?.specialtyLimit ?? 2}</legend>
                {[
                  'Desenvolvimento de jovens',
                  'Ensino tático',
                  'Gestão humana',
                  'Preparação de partidas',
                  'Avaliação',
                ].map((specialty) => (
                  <label key={specialty}>
                    <input
                      checked={draft.specialties.includes(specialty)}
                      disabled={
                        !draft.specialties.includes(specialty) &&
                        draft.specialties.length >= (evaluation?.specialtyLimit ?? 2)
                      }
                      onChange={(event) =>
                        patch({
                          specialties: event.target.checked
                            ? [...draft.specialties, specialty]
                            : draft.specialties.filter((value) => value !== specialty),
                        })
                      }
                      type="checkbox"
                    />
                    {specialty}
                  </label>
                ))}
              </fieldset>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <header>
              <h3 id="coach-stage-title">Revisão do treinador</h3>
              <p>Capacidade, adequação contextual e reputação são grandezas diferentes.</p>
            </header>
            <div className="coach-review">
              <div className="coach-review__identity">
                <CoachDraftPortrait draft={draft} size="compact" />
                <div>
                  <h4>{draft.knownName || 'Treinador sem nome'}</h4>
                  <p>
                    {draft.firstName} {draft.lastName} · {draft.age} anos · {draft.nationality}
                  </p>
                  <span>{background.label}</span>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Avaliação contextual</dt>
                  <dd>{contextual ?? 'Calculando…'}</dd>
                </div>
                <div>
                  <dt>Reputação</dt>
                  <dd>{draft.reputation}</dd>
                </div>
                <div>
                  <dt>Licença</dt>
                  <dd>{draft.qualification}</dd>
                </div>
                <div>
                  <dt>Pontos restantes</dt>
                  <dd>{remaining ?? 'Calculando…'}</dd>
                </div>
              </dl>
              <section>
                <h4>Forças</h4>
                <p>
                  {attributeMeta
                    .toSorted(
                      (left, right) => draft.attributes[right.key] - draft.attributes[left.key],
                    )
                    .slice(0, 3)
                    .map((attribute) => attribute.label)
                    .join(' · ')}
                </p>
              </section>
              <section>
                <h4>Limitações</h4>
                <p>
                  {attributeMeta
                    .toSorted(
                      (left, right) => draft.attributes[left.key] - draft.attributes[right.key],
                    )
                    .slice(0, 2)
                    .map((attribute) => attribute.label)
                    .join(' · ')}
                </p>
              </section>
            </div>
          </>
        )}
      </section>

      <aside className="coach-creator__summary" aria-label="Resumo permanente do treinador">
        <CoachDraftPortrait decorative draft={draft} size="compact" />
        <div>
          <small>Seu treinador</small>
          <strong>{draft.knownName || 'Ainda sem nome'}</strong>
          <span>{background.label}</span>
        </div>
        <dl>
          <div>
            <dt>Pontos</dt>
            <dd>{remaining ?? '—'}</dd>
          </div>
          <div>
            <dt>Avaliação</dt>
            <dd>{contextual ?? '—'}</dd>
          </div>
          <div>
            <dt>Reputação</dt>
            <dd>{draft.reputation}</dd>
          </div>
        </dl>
        <strong className="coach-balance-label">
          {evaluation?.balanceLabel ?? 'Calculando equilíbrio…'}
        </strong>
        <section>
          <h4>Forças</h4>
          <p>{evaluation?.strengths.join(' · ') || 'A definir'}</p>
        </section>
        <section>
          <h4>Limitações</h4>
          <p>{evaluation?.limitations.join(' · ') || 'A definir'}</p>
        </section>
      </aside>

      <footer className="coach-creator__footer">
        <Button
          disabled={step === 0}
          onClick={() => setStep((current) => current - 1)}
          variant="secondary"
        >
          Anterior
        </Button>
        <span>
          Etapa {step + 1} de {creatorSteps.length} · {creatorSteps[step]}
        </span>
        <Button
          disabled={step === creatorSteps.length - 1 || !stepValid}
          onClick={() => setStep((current) => current + 1)}
          variant="primary"
        >
          Próximo
        </Button>
      </footer>
    </div>
  );
}
