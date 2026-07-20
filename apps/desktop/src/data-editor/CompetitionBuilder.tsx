import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import type {
  CommunityChange,
  ModAuthoringWorld,
  StudioCompetition,
  StudioCompetitionStage,
} from './types.js';

type Template =
  | 'doubleLeague'
  | 'singleLeague'
  | 'singleKnockout'
  | 'knockout'
  | 'groups'
  | 'groupsKnockout'
  | 'multiStage'
  | 'empty';

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'competicao';

const stage = (
  kind: StudioCompetitionStage['kind'],
  name: string,
  participants: number,
  order = 1,
): StudioCompetitionStage => ({
  id: `stage.${order}`,
  name,
  order,
  kind,
  participantCount: participants,
  groupCount: kind === 'groups' ? 4 : 0,
  legs: kind === 'doubleRoundRobin' || kind === 'twoLeggedKnockout' ? 2 : 1,
  advanceCount: kind === 'groups' ? Math.max(2, Math.floor(participants / 2)) : 0,
  eliminateCount:
    kind.includes('knockout') || kind === 'singleFinal' ? Math.floor(participants / 2) : 0,
  pointsForWin: kind.includes('roundRobin') || kind === 'groups' ? 3 : null,
  pointsForDraw: kind.includes('roundRobin') || kind === 'groups' ? 1 : null,
  pointsForLoss: kind.includes('roundRobin') || kind === 'groups' ? 0 : null,
  tieBreakers: ['points', 'wins', 'goalDifference', 'goalsFor', 'headToHead', 'fairPlay', 'draw'],
  extraTime: kind.includes('knockout') || kind === 'singleFinal',
  penalties: kind.includes('knockout') || kind === 'singleFinal',
  neutralVenue: kind === 'singleFinal',
});

const templateStages = (template: Template, participants: number): StudioCompetitionStage[] => {
  if (template === 'singleLeague') return [stage('roundRobin', 'Liga', participants)];
  if (template === 'doubleLeague') return [stage('doubleRoundRobin', 'Liga', participants)];
  if (template === 'singleKnockout') return [stage('knockout', 'Mata-mata', participants)];
  if (template === 'knockout') return [stage('twoLeggedKnockout', 'Mata-mata', participants)];
  if (template === 'groups') return [stage('groups', 'Fase de grupos', participants)];
  if (template === 'groupsKnockout') {
    return [
      stage('groups', 'Fase de grupos', participants),
      stage('knockout', 'Mata-mata', Math.max(2, Math.floor(participants / 2)), 2),
    ];
  }
  if (template === 'multiStage') {
    return [
      stage('groups', 'Fase de grupos', participants, 1),
      stage('twoLeggedKnockout', 'Eliminatórias', Math.max(4, Math.floor(participants / 2)), 2),
      stage('singleFinal', 'Final', 2, 3),
    ];
  }
  return [];
};

const stageMath = (item: StudioCompetitionStage) => {
  const teams = Math.max(0, item.participantCount);
  if (item.kind === 'roundRobin')
    return { rounds: Math.max(0, teams - 1), matches: (teams * (teams - 1)) / 2 };
  if (item.kind === 'doubleRoundRobin')
    return { rounds: Math.max(0, (teams - 1) * 2), matches: teams * (teams - 1) };
  if (item.kind === 'groups') {
    const perGroup = item.groupCount ? teams / item.groupCount : 0;
    return {
      rounds: Number.isInteger(perGroup) ? Math.max(0, (perGroup - 1) * item.legs) : 0,
      matches: Number.isInteger(perGroup)
        ? item.groupCount * ((perGroup * (perGroup - 1)) / 2) * item.legs
        : 0,
    };
  }
  const rounds = teams > 1 ? Math.ceil(Math.log2(teams)) : 0;
  return { rounds, matches: Math.max(0, teams - 1) * item.legs };
};

export function CompetitionBuilder({
  world,
  author,
  onUpsert,
  initialCompetition,
}: {
  readonly world: ModAuthoringWorld;
  readonly author: string;
  readonly onUpsert: (change: CommunityChange) => void;
  readonly initialCompetition?: StudioCompetition | null;
}) {
  const initialSeason = initialCompetition?.seasons[0];
  const initialRules = initialSeason?.rules ?? {};
  const ruleNumber = (key: string, fallback: number) =>
    typeof initialRules[key] === 'number' ? Number(initialRules[key]) : fallback;
  const [name, setName] = useState(initialCompetition?.name ?? 'Nova competição');
  const [shortName, setShortName] = useState(initialCompetition?.shortName ?? 'NC');
  const [description, setDescription] = useState(initialCompetition?.description ?? '');
  const [category, setCategory] = useState(initialCompetition?.category ?? 'league');
  const [level, setLevel] = useState(initialCompetition?.level ?? 1);
  const [nationId, setNationId] = useState(
    initialCompetition?.nationId ?? world.nations[0]?.id ?? '',
  );
  const [template, setTemplate] = useState<Template>('doubleLeague');
  const [participants, setParticipants] = useState<string[]>([
    ...(initialSeason?.participantClubIds ?? []),
  ]);
  const previousParticipantCount = useRef(participants.length);
  const [stages, setStages] = useState<StudioCompetitionStage[]>(() =>
    initialSeason?.stages.length ? [...initialSeason.stages] : templateStages('doubleLeague', 0),
  );
  const [seasonLabel, setSeasonLabel] = useState(initialSeason?.label ?? '2026');
  const [startDate, setStartDate] = useState(initialSeason?.startDate ?? '2026-08-01');
  const [endDate, setEndDate] = useState(initialSeason?.endDate ?? '2027-05-31');
  const [participantSearch, setParticipantSearch] = useState('');
  const [pointsForWin, setPointsForWin] = useState(ruleNumber('pointsForWin', 3));
  const [pointsForDraw, setPointsForDraw] = useState(ruleNumber('pointsForDraw', 1));
  const [promotionSlots, setPromotionSlots] = useState(ruleNumber('promotionSlots', 0));
  const [relegationSlots, setRelegationSlots] = useState(ruleNumber('relegationSlots', 0));
  const [benchSize, setBenchSize] = useState(ruleNumber('benchSize', 7));
  const [substitutions, setSubstitutions] = useState(ruleNumber('substitutions', 5));

  useEffect(() => {
    const previous = previousParticipantCount.current;
    const next = participants.length;
    previousParticipantCount.current = next;
    if (previous === next) return;
    setStages((current) =>
      current.map((item, index) =>
        index === 0 && item.participantCount === previous
          ? { ...item, participantCount: next }
          : item,
      ),
    );
  }, [participants.length]);
  const visibleClubs = world.clubs.filter((club) =>
    `${club.name} ${club.shortName} ${club.city}`
      .toLocaleLowerCase('pt-BR')
      .includes(participantSearch.trim().toLocaleLowerCase('pt-BR')),
  );
  const totals = useMemo(
    () =>
      stages.reduce(
        (value, item) => {
          const next = stageMath(item);
          return { rounds: value.rounds + next.rounds, matches: value.matches + next.matches };
        },
        { rounds: 0, matches: 0 },
      ),
    [stages],
  );
  const warnings = [
    ...(participants.length !== stages[0]?.participantCount
      ? [
          `O primeiro estágio espera ${stages[0]?.participantCount ?? 0} clubes; ${participants.length} foram selecionados.`,
        ]
      : []),
    ...stages.flatMap((item) =>
      item.kind === 'groups' && item.groupCount > 0 && item.participantCount % item.groupCount !== 0
        ? [
            `${item.name}: participantes não podem ser divididos igualmente em ${item.groupCount} grupos.`,
          ]
        : [],
    ),
  ];
  const applyTemplate = (next: Template) => {
    setTemplate(next);
    setStages(templateStages(next, participants.length));
  };
  const save = () => {
    const id =
      initialCompetition?.id ?? `community.${slug(author || 'autor')}.competition.${slug(name)}`;
    const seasonId = initialSeason?.id ?? `${id}.season.2026-27`;
    const competition: StudioCompetition = {
      id,
      name: name.trim(),
      shortName: shortName.trim(),
      nationId,
      category,
      level,
      description: description.trim() || null,
      primaryColor: initialCompetition?.primaryColor ?? '#36d39a',
      secondaryColor: initialCompetition?.secondaryColor ?? '#123b32',
      logoAssetId: initialCompetition?.logoAssetId ?? null,
      baseSeasonId: seasonId,
      seasons: [
        {
          ...initialSeason,
          id: seasonId,
          competitionId: id,
          label: seasonLabel.trim(),
          startDate,
          endDate,
          participantClubIds: participants,
          stages,
          rules: {
            ...initialRules,
            pointsForWin,
            pointsForDraw,
            pointsForLoss: 0,
            participantCount: participants.length,
            rounds: totals.rounds,
            legs: stages[0]?.legs ?? 1,
            tieBreakers: stages[0]?.tieBreakers ?? [],
            minimumRosterSize: 18,
            minimumGoalkeepers: 2,
            starters: 11,
            benchSize,
            substitutions,
            extraTime: stages.some((item) => item.extraTime),
            penalties: stages.some((item) => item.penalties),
            foreignPlayerLimit: null,
            minimumHomegrownPlayers: null,
            promotionSlots,
            relegationSlots,
          },
          registrationWindows: initialSeason?.registrationWindows.length
            ? initialSeason.registrationWindows
            : [{ startDate, endDate }],
          calendarConstraints: initialSeason?.calendarConstraints ?? {
            preferredWeekdays: [3, 6, 7],
            kickoffTimes: ['16:00', '19:30'],
            minimumRestDays: 2,
            blockedDates: [],
            neutralVenue: false,
          },
          playerRegistrations: initialSeason?.playerRegistrations ?? [],
        },
        ...(initialCompetition?.seasons.slice(1) ?? []),
      ],
    };
    onUpsert({
      id: `competition:${id}`,
      kind: 'competition',
      operation: initialCompetition ? 'edit' : 'create',
      targetId: id,
      label: competition.name,
      summary: `${participants.length} clubes · ${stages.length} estágio(s) · ${totals.matches} partidas previstas`,
      patches: [
        {
          operation: initialCompetition ? 'replace' : 'add',
          entityKind: 'competition',
          targetId: id,
          entity: { kind: 'competition', value: competition },
          reason: `Competição ${initialCompetition ? 'editada' : 'criada'} por ${author.trim() || 'autor comunitário'}`,
        },
      ],
      asset: null,
    });
  };

  return (
    <section className="competition-builder" aria-labelledby="competition-builder-title">
      <header>
        <div>
          <span>Competition Builder</span>
          <h2 id="competition-builder-title">Modele o regulamento, não as partidas</h2>
          <p>Defina identidade, participantes e regulamento. Nenhuma partida é agendada aqui.</p>
        </div>
        <Button
          disabled={!name.trim() || !shortName.trim() || !nationId}
          onClick={save}
          variant="primary"
        >
          Salvar competição
        </Button>
      </header>

      <div
        className="competition-builder__templates"
        aria-label="Modelos de competição"
        role="radiogroup"
      >
        {(
          [
            ['doubleLeague', 'Liga · turno e returno'],
            ['singleLeague', 'Liga · turno único'],
            ['singleKnockout', 'Mata-mata'],
            ['knockout', 'Mata-mata ida e volta'],
            ['groups', 'Grupos'],
            ['groupsKnockout', 'Grupos + mata-mata'],
            ['multiStage', 'Múltiplos estágios'],
            ['empty', 'Template vazio'],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-checked={template === value}
            key={value}
            onClick={() => applyTemplate(value)}
            role="radio"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="competition-builder__layout">
        <div className="competition-builder__main">
          <section className="studio-panel">
            <h3>Identidade e temporada</h3>
            <div className="studio-form-grid">
              <label>
                Nome
                <input onChange={(event) => setName(event.target.value)} value={name} />
              </label>
              <label>
                Nome curto ou sigla
                <input
                  maxLength={32}
                  onChange={(event) => setShortName(event.target.value)}
                  placeholder="Ex.: Brasileirão"
                  value={shortName}
                />
                <small>Pode ser uma sigla ou o nome popular da competição.</small>
              </label>
              <label>
                País ou região
                <select onChange={(event) => setNationId(event.target.value)} value={nationId}>
                  {world.nations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Categoria
                <select onChange={(event) => setCategory(event.target.value)} value={category}>
                  <option value="league">Liga</option>
                  <option value="cup">Copa</option>
                  <option value="continental">Continental</option>
                  <option value="youth">Base</option>
                  <option value="women">Feminina</option>
                  <option value="other">Outra</option>
                </select>
              </label>
              <label>
                Nível
                <input
                  min={1}
                  onChange={(event) => setLevel(Number(event.target.value))}
                  type="number"
                  value={level}
                />
              </label>
              <label>
                Temporada
                <input
                  maxLength={32}
                  onChange={(event) => setSeasonLabel(event.target.value)}
                  value={seasonLabel}
                />
              </label>
              <label className="studio-form-grid__wide">
                Descrição
                <textarea
                  maxLength={1000}
                  onChange={(event) => setDescription(event.target.value)}
                  value={description}
                />
              </label>
              <label>
                Início
                <input
                  onChange={(event) => setStartDate(event.target.value)}
                  type="date"
                  value={startDate}
                />
              </label>
              <label>
                Fim
                <input
                  onChange={(event) => setEndDate(event.target.value)}
                  type="date"
                  value={endDate}
                />
              </label>
            </div>
          </section>

          <section className="studio-panel">
            <div className="studio-panel__heading">
              <div>
                <h3>Participantes</h3>
                <p>Seleção por ID estável; nomes são apenas apresentação.</p>
              </div>
              <strong>{participants.length}</strong>
            </div>
            <div className="competition-participant-toolbar">
              <input
                aria-label="Buscar clubes participantes"
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Buscar clube, cidade ou sigla"
                value={participantSearch}
              />
              <Button
                onClick={() =>
                  setParticipants((current) => [
                    ...new Set([...current, ...visibleClubs.map((club) => club.id)]),
                  ])
                }
                variant="secondary"
              >
                Selecionar visíveis
              </Button>
              <Button
                disabled={participants.length === 0}
                onClick={() => setParticipants([])}
                variant="secondary"
              >
                Limpar
              </Button>
            </div>
            <div className="competition-participants">
              {visibleClubs.map((club) => (
                <label key={club.id}>
                  <input
                    checked={participants.includes(club.id)}
                    onChange={(event) => {
                      setParticipants((current) =>
                        event.target.checked
                          ? [...current, club.id]
                          : current.filter((id) => id !== club.id),
                      );
                    }}
                    type="checkbox"
                  />
                  <span>
                    <strong>{club.name}</strong>
                    <small>
                      {club.city} · {club.shortName}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="studio-panel">
            <div className="studio-panel__heading">
              <div>
                <h3>Estágios</h3>
                <p>Ordene e refine cada etapa da competição.</p>
              </div>
              <Button
                onClick={() =>
                  setStages((current) => [
                    ...current,
                    stage(
                      'knockout',
                      `Estágio ${current.length + 1}`,
                      Math.max(2, participants.length),
                      current.length + 1,
                    ),
                  ])
                }
                variant="secondary"
              >
                Adicionar estágio
              </Button>
            </div>
            <ol className="competition-stages">
              {stages.map((item, index) => (
                <li key={item.id}>
                  <span>{index + 1}</span>
                  <div>
                    <input
                      aria-label={`Nome do estágio ${index + 1}`}
                      onChange={(event) =>
                        setStages((current) =>
                          current.map((candidate, position) =>
                            position === index
                              ? { ...candidate, name: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      value={item.name}
                    />
                    <select
                      aria-label={`Formato do estágio ${index + 1}`}
                      onChange={(event) =>
                        setStages((current) =>
                          current.map((candidate, position) =>
                            position === index
                              ? {
                                  ...candidate,
                                  kind: event.target.value as StudioCompetitionStage['kind'],
                                }
                              : candidate,
                          ),
                        )
                      }
                      value={item.kind}
                    >
                      <option value="roundRobin">Turno único</option>
                      <option value="doubleRoundRobin">Turno e returno</option>
                      <option value="groups">Grupos</option>
                      <option value="knockout">Mata-mata</option>
                      <option value="twoLeggedKnockout">Mata-mata ida e volta</option>
                      <option value="singleFinal">Final única</option>
                      <option value="qualifying">Classificatória</option>
                    </select>
                  </div>
                  <label>
                    Clubes
                    <input
                      min={2}
                      onChange={(event) =>
                        setStages((current) =>
                          current.map((candidate, position) =>
                            position === index
                              ? { ...candidate, participantCount: Number(event.target.value) }
                              : candidate,
                          ),
                        )
                      }
                      type="number"
                      value={item.participantCount}
                    />
                  </label>
                  <button
                    aria-label={`Remover ${item.name}`}
                    onClick={() =>
                      setStages((current) =>
                        current
                          .filter((_, position) => position !== index)
                          .map((candidate, position) => ({ ...candidate, order: position + 1 })),
                      )
                    }
                    type="button"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="studio-panel">
            <div className="studio-panel__heading">
              <div>
                <h3>Regulamento</h3>
                <p>Configure somente as regras da competição; a simulação não roda neste editor.</p>
              </div>
            </div>
            <div className="studio-form-grid competition-rules-grid">
              <label>
                Pontos por vitória
                <input
                  max={10}
                  min={0}
                  onChange={(event) => setPointsForWin(Number(event.target.value))}
                  type="number"
                  value={pointsForWin}
                />
              </label>
              <label>
                Pontos por empate
                <input
                  max={10}
                  min={0}
                  onChange={(event) => setPointsForDraw(Number(event.target.value))}
                  type="number"
                  value={pointsForDraw}
                />
              </label>
              <label>
                Promoções
                <input
                  min={0}
                  onChange={(event) => setPromotionSlots(Number(event.target.value))}
                  type="number"
                  value={promotionSlots}
                />
              </label>
              <label>
                Rebaixamentos
                <input
                  min={0}
                  onChange={(event) => setRelegationSlots(Number(event.target.value))}
                  type="number"
                  value={relegationSlots}
                />
              </label>
              <label>
                Banco
                <input
                  min={0}
                  onChange={(event) => setBenchSize(Number(event.target.value))}
                  type="number"
                  value={benchSize}
                />
              </label>
              <label>
                Substituições
                <input
                  min={0}
                  onChange={(event) => setSubstitutions(Number(event.target.value))}
                  type="number"
                  value={substitutions}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="competition-preview">
          <span>Preview matemático</span>
          <strong>{totals.matches}</strong>
          <p>partidas esperadas</p>
          <dl>
            <div>
              <dt>Participantes</dt>
              <dd>{participants.length}</dd>
            </div>
            <div>
              <dt>Estágios</dt>
              <dd>{stages.length}</dd>
            </div>
            <div>
              <dt>Rodadas</dt>
              <dd>{totals.rounds}</dd>
            </div>
            <div>
              <dt>Partidas agendadas</dt>
              <dd>Nenhuma</dd>
            </div>
          </dl>
          {warnings.length > 0 && (
            <div className="competition-warnings" role="status">
              <strong>Revise antes de salvar</strong>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
