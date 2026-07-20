import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { Button } from '../ui/primitives/actions.js';
import type { CoachAttributes, CoachBackground, CoachCreatorDraft, WorldNation } from './types.js';

const creatorSteps = ['Identidade', 'Aparência', 'Histórico', 'Capacidades', 'Estilo', 'Revisão'];

const backgroundOptions: readonly {
  value: CoachBackground;
  label: string;
  description: string;
  budget: number;
}[] = [
  {
    value: 'professionalPlayer',
    label: 'Ex-jogador profissional',
    description: 'Mais experiência e reputação, com expectativas iniciais maiores.',
    budget: 290,
  },
  {
    value: 'amateurPlayer',
    label: 'Ex-jogador amador',
    description: 'Vivência de campo moderada e desenvolvimento equilibrado.',
    budget: 265,
  },
  {
    value: 'tacticalAnalyst',
    label: 'Analista tático',
    description: 'Leitura de jogo e preparação em destaque.',
    budget: 275,
  },
  {
    value: 'youthDeveloper',
    label: 'Formador de jovens',
    description: 'Desenvolvimento e comunicação como pontos de partida.',
    budget: 275,
  },
  {
    value: 'peopleManager',
    label: 'Gestor de pessoas',
    description: 'Motivação, disciplina e gestão humana em primeiro plano.',
    budget: 275,
  },
  {
    value: 'beginner',
    label: 'Treinador iniciante',
    description: 'Reputação baixa e orçamento mais restrito para uma jornada de crescimento.',
    budget: 235,
  },
  {
    value: 'balanced',
    label: 'Perfil equilibrado',
    description: 'Sem força dominante; flexível para diferentes projetos.',
    budget: 260,
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
  qualification: 'Licença Nacional',
  experienceYears: 3,
  reputation: 42,
  style: 'Equilibrado',
  preferredFormations: ['4-3-3'],
  specialties: [],
  attributes: baseAttributes(),
  appearance: {
    skinTone: 3,
    faceShape: 'oval',
    hairStyle: 'curto',
    hairColor: 'castanho',
    facialHair: 'nenhuma',
    glasses: false,
    clothing: 'social escuro',
  },
  portrait: null,
});

interface CoachCreatorProps {
  readonly draft: CoachCreatorDraft;
  readonly nations: readonly WorldNation[];
  readonly onChange: (draft: CoachCreatorDraft) => void;
}

export function CoachCreator({ draft, nations, onChange }: CoachCreatorProps) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<CoachAttributes[]>([]);
  const [portraitError, setPortraitError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const creatorRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0;
    const wizardContent = creatorRef.current?.closest<HTMLElement>('.career-wizard__content');
    if (wizardContent) wizardContent.scrollTop = 0;
  }, [step]);
  const background = backgroundOptions.find((option) => option.value === draft.background)!;
  const usedPoints = useMemo(
    () =>
      Object.values(draft.attributes).reduce((total, value) => total + Math.max(0, value - 40), 0),
    [draft.attributes],
  );
  const remaining = background.budget - usedPoints;
  const contextual = Math.round(
    draft.attributes.tactical * 0.28 +
      draft.attributes.preparation * 0.2 +
      draft.attributes.peopleManagement * 0.2 +
      draft.attributes.motivation * 0.12 +
      draft.attributes.adaptability * 0.1 +
      draft.attributes.decisionMaking * 0.1,
  );

  const patch = (changes: Partial<CoachCreatorDraft>) => onChange({ ...draft, ...changes });
  const setAttribute = (key: keyof CoachAttributes, value: number) => {
    setHistory((current) => [...current.slice(-9), draft.attributes]);
    patch({ attributes: { ...draft.attributes, [key]: value } });
  };

  const randomizeAppearance = () => {
    const random = new Uint32Array(4);
    globalThis.crypto?.getRandomValues(random);
    patch({
      appearance: {
        skinTone: (random[0] ?? Date.now()) % 8,
        faceShape: ['oval', 'quadrado', 'angular'][(random[1] ?? 0) % 3]!,
        hairStyle: ['curto', 'raspado', 'ondulado', 'cacheado'][(random[2] ?? 0) % 4]!,
        hairColor: ['preto', 'castanho', 'grisalho', 'ruivo'][(random[3] ?? 0) % 4]!,
        facialHair: ['nenhuma', 'barba curta', 'bigode'][(random[0] ?? 0) % 3]!,
        glasses: (random[1] ?? 0) % 3 === 0,
        clothing: ['social escuro', 'agasalho do clube', 'camisa esportiva'][(random[2] ?? 0) % 3]!,
      },
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
    patch({
      portrait: {
        fileName: file.name.replace(/[^A-Za-z0-9._-]/gu, '_'),
        mimeType: file.type,
        bytes: [...new Uint8Array(await file.arrayBuffer())],
      },
    });
  };

  const identityValid =
    draft.firstName.trim().length > 0 &&
    draft.lastName.trim().length > 0 &&
    draft.knownName.trim().length > 0 &&
    draft.age >= 21 &&
    draft.age <= 85;
  const stepValid = step !== 0 || identityValid;

  return (
    <div className="coach-creator" ref={creatorRef}>
      <nav aria-label="Etapas do criador de treinador" className="coach-creator__steps">
        {creatorSteps.map((label, index) => (
          <button
            aria-current={index === step ? 'step' : undefined}
            disabled={index > step + 1}
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
              <h3 id="coach-stage-title">Quem vai liderar o clube?</h3>
              <p>A identidade pertence ao save e recebe um ID estável independente do nome.</p>
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
                Data de nascimento
                <input
                  onChange={(event) => patch({ birthDate: event.target.value })}
                  type="date"
                  value={draft.birthDate}
                />
              </label>
              <label>
                Idade
                <input
                  max={85}
                  min={21}
                  onChange={(event) => patch({ age: Number(event.target.value) })}
                  type="number"
                  value={draft.age}
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
              </label>
            </div>
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
              <p>Uma identidade local, sem serviços externos. O retrato é opcional e protegido.</p>
            </header>
            <div className="appearance-editor">
              <div
                aria-label="Prévia da aparência do treinador"
                className="coach-avatar-preview"
                data-glasses={draft.appearance.glasses || undefined}
                style={{ '--skin-tone': draft.appearance.skinTone } as CSSProperties}
              >
                <span>{draft.knownName.slice(0, 2).toUpperCase() || 'RV'}</span>
                <small>{draft.appearance.hairStyle}</small>
              </div>
              <div className="coach-form-grid">
                <label>
                  Tom de pele
                  <input
                    max={7}
                    min={0}
                    onChange={(event) =>
                      patch({
                        appearance: { ...draft.appearance, skinTone: Number(event.target.value) },
                      })
                    }
                    type="range"
                    value={draft.appearance.skinTone}
                  />
                </label>
                {(
                  [
                    ['faceShape', 'Formato do rosto', ['oval', 'quadrado', 'angular']],
                    ['hairStyle', 'Cabelo', ['curto', 'raspado', 'ondulado', 'cacheado']],
                    ['hairColor', 'Cor do cabelo', ['preto', 'castanho', 'grisalho', 'ruivo']],
                    ['facialHair', 'Barba', ['nenhuma', 'barba curta', 'bigode']],
                    [
                      'clothing',
                      'Roupa',
                      ['social escuro', 'agasalho do clube', 'camisa esportiva'],
                    ],
                  ] as const
                ).map(([key, label, options]) => (
                  <label key={key}>
                    {label}
                    <select
                      onChange={(event) =>
                        patch({ appearance: { ...draft.appearance, [key]: event.target.value } })
                      }
                      value={draft.appearance[key]}
                    >
                      {options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <label className="checkbox-label">
                  <input
                    checked={draft.appearance.glasses}
                    onChange={(event) =>
                      patch({ appearance: { ...draft.appearance, glasses: event.target.checked } })
                    }
                    type="checkbox"
                  />
                  Óculos
                </label>
              </div>
              <div className="appearance-actions">
                <Button leadingIcon="retry" onClick={randomizeAppearance} variant="secondary">
                  Randomizar
                </Button>
                <Button
                  onClick={() => patch({ appearance: defaultCoachDraft().appearance })}
                  variant="secondary"
                >
                  Restaurar
                </Button>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Importar retrato local"
                  className="sr-only"
                  onChange={(event) => void importPortrait(event.target.files?.[0])}
                  ref={fileRef}
                  type="file"
                />
                <Button onClick={() => fileRef.current?.click()} variant="secondary">
                  Importar retrato
                </Button>
                {draft.portrait && (
                  <Button onClick={() => patch({ portrait: null })} variant="secondary">
                    Remover retrato
                  </Button>
                )}
              </div>
              {portraitError && <p className="field-error">{portraitError}</p>}
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
                  <em>{option.budget} pontos</em>
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
                  max={30}
                  min={0}
                  onChange={(event) => patch({ experienceYears: Number(event.target.value) })}
                  type="number"
                  value={draft.experienceYears}
                />
              </label>
              <label>
                Reputação inicial
                <input
                  max={70}
                  min={20}
                  onChange={(event) => patch({ reputation: Number(event.target.value) })}
                  type="range"
                  value={draft.reputation}
                />
                <output>{draft.reputation}</output>
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <header className="capability-heading">
              <div>
                <h3 id="coach-stage-title">Capacidades</h3>
                <p>O domínio valida orçamento, caps e coerência antes de criar a entidade.</p>
              </div>
              <div className="points-meter" data-negative={remaining < 0 || undefined}>
                <strong>{remaining}</strong>
                <span>pontos restantes</span>
              </div>
            </header>
            <div className="attribute-actions">
              <Button
                disabled={history.length === 0}
                onClick={() => {
                  const previous = history.at(-1);
                  if (previous) {
                    patch({ attributes: previous });
                    setHistory((current) => current.slice(0, -1));
                  }
                }}
                variant="secondary"
              >
                Desfazer
              </Button>
              <Button onClick={() => patch({ attributes: baseAttributes() })} variant="secondary">
                Resetar
              </Button>
            </div>
            <div className="attribute-groups">
              {[...new Set(attributeMeta.map((attribute) => attribute.group))].map((group) => (
                <fieldset key={group}>
                  <legend>{group}</legend>
                  {attributeMeta
                    .filter((attribute) => attribute.group === group)
                    .map((attribute) => (
                      <label key={attribute.key}>
                        <span>{attribute.label}</span>
                        <input
                          aria-label={attribute.label}
                          max={85}
                          min={20}
                          onChange={(event) =>
                            setAttribute(attribute.key, Number(event.target.value))
                          }
                          type="range"
                          value={draft.attributes[attribute.key]}
                        />
                        <output>{draft.attributes[attribute.key]}</output>
                      </label>
                    ))}
                </fieldset>
              ))}
            </div>
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
                <legend>Especialidades — até 2</legend>
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
                        !draft.specialties.includes(specialty) && draft.specialties.length >= 2
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
                <div className="coach-avatar-preview">
                  <span>{draft.knownName.slice(0, 2).toUpperCase() || 'RV'}</span>
                </div>
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
                  <dd>{contextual}</dd>
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
                  <dd>{remaining}</dd>
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

      <footer className="coach-creator__footer">
        <Button
          disabled={step === 0}
          onClick={() => setStep((current) => current - 1)}
          variant="secondary"
        >
          Anterior
        </Button>
        <span>
          {step + 1} de {creatorSteps.length}
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
