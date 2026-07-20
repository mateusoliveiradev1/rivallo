import { useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import type { Position } from '../matchday/types.js';
import type { StudioModuleId } from './authoring-graph.js';
import type {
  CommunityChange,
  FactualPerson,
  ModAuthoringWorld,
  PersonRoleKind,
  PreferredFoot,
  ProvenanceVerificationStatus,
} from './types.js';

const positions: readonly Position[] = ['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'];

const slug = (value: string, fallback: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || fallback;

const roleForModule = (module: StudioModuleId): PersonRoleKind =>
  module === 'players' ? 'player' : module === 'staff' ? 'staffMember' : 'coach';

const numberOrNull = (value: string) => (value.trim() ? Number(value) : null);

const isFactualPerson = (value: unknown): value is FactualPerson =>
  Boolean(value && typeof value === 'object' && 'personId' in value);

export function FactualPersonEditor({
  module,
  recordValue,
  author,
  world,
  onUpsert,
}: {
  readonly module: StudioModuleId;
  readonly recordValue: unknown;
  readonly author: string;
  readonly world: ModAuthoringWorld;
  readonly onUpsert: (change: CommunityChange) => void;
}) {
  const existing = isFactualPerson(recordValue) ? recordValue : null;
  const roleKind = roleForModule(module);
  const existingRole = existing?.roles.find((role) => role.kind === roleKind);
  const [fullName, setFullName] = useState(existing?.fullName ?? '');
  const [knownName, setKnownName] = useState(existing?.knownName ?? '');
  const [roleId, setRoleId] = useState(existingRole?.roleId ?? '');
  const [roleTitle, setRoleTitle] = useState(existingRole?.title ?? '');
  const [clubId, setClubId] = useState(existingRole?.clubId ?? '');
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? '');
  const [nationalityId, setNationalityId] = useState(existing?.nationalityId ?? '');
  const [secondNationalityId, setSecondNationalityId] = useState(
    existing?.secondNationalityId ?? '',
  );
  const [heightCm, setHeightCm] = useState(existing?.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(existing?.weightKg?.toString() ?? '');
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot | ''>(
    existing?.preferredFoot ?? '',
  );
  const [position, setPosition] = useState<Position | ''>(existing?.detailedPosition ?? '');
  const [shirtNumber, setShirtNumber] = useState(existing?.shirtNumber?.toString() ?? '');
  const [externalSource, setExternalSource] = useState(existing?.externalIds[0]?.source ?? '');
  const [externalId, setExternalId] = useState(existing?.externalIds[0]?.externalId ?? '');
  const [source, setSource] = useState(existing?.provenance[0]?.source ?? '');
  const [sourceRecordId, setSourceRecordId] = useState(
    existing?.provenance[0]?.sourceRecordId ?? '',
  );
  const [verification, setVerification] = useState<ProvenanceVerificationStatus>(
    existing?.provenance[0]?.verificationStatus ?? 'pending',
  );

  const labels = useMemo(
    () => ({
      title:
        roleKind === 'player'
          ? 'Identidade factual do jogador'
          : roleKind === 'coach'
            ? 'Identidade factual do treinador'
            : 'Identidade factual da comissão',
      roleId:
        roleKind === 'player' ? 'Player ID' : roleKind === 'coach' ? 'Coach ID' : 'Staff member ID',
    }),
    [roleKind],
  );

  const save = () => {
    const personId = existing?.personId ?? `community.person.${slug(roleId || fullName, 'draft')}`;
    const identityPartial = !birthDate || !nationalityId || verification !== 'verified';
    const blockers = [
      ...(identityPartial ? ['person.partial_identity'] : []),
      ...(roleKind === 'player' && !position ? ['player.position_unknown'] : []),
      roleKind === 'player' ? 'player.evaluation_missing' : 'coach.evaluation_missing',
      'person.runtime_profile_blocked',
      'person.gameplay_blocked',
    ];
    const knownFields = [
      'fullName',
      ...(knownName ? ['knownName'] : []),
      ...(birthDate ? ['birthDate'] : []),
      ...(nationalityId ? ['nationalityId'] : []),
      ...(secondNationalityId ? ['secondNationalityId'] : []),
      ...(heightCm ? ['heightCm'] : []),
      ...(weightKg ? ['weightKg'] : []),
      ...(preferredFoot ? ['preferredFoot'] : []),
      ...(position ? ['detailedPosition'] : []),
      ...(shirtNumber ? ['shirtNumber'] : []),
    ];
    const person: FactualPerson = {
      personId,
      externalIds:
        externalSource.trim() && externalId.trim()
          ? [{ source: externalSource.trim(), externalId: externalId.trim() }]
          : (existing?.externalIds ?? []),
      fullName: fullName.trim(),
      knownName: knownName.trim() || null,
      birthDate: birthDate || null,
      heightCm: numberOrNull(heightCm),
      weightKg: numberOrNull(weightKg),
      preferredFoot: preferredFoot || null,
      nationalityId: nationalityId || null,
      secondNationalityId: secondNationalityId || null,
      detailedPosition: position || null,
      shirtNumber: numberOrNull(shirtNumber),
      contract: existing?.contract ?? null,
      roles: [
        ...(existing?.roles.filter((role) => role.kind !== roleKind) ?? []),
        {
          roleId: roleId.trim(),
          kind: roleKind,
          clubId: clubId || null,
          title: roleTitle.trim() || null,
        },
      ],
      provenance: [
        {
          source: source.trim(),
          sourceRecordId: sourceRecordId.trim() || null,
          observedAt: existing?.provenance[0]?.observedAt ?? null,
          verificationStatus: verification,
          fields: knownFields,
        },
      ],
      readiness: {
        identity: identityPartial ? 'partialFactualIdentity' : 'verifiedFactualIdentity',
        structural: 'structurallyValid',
        runtimeProfile: 'runtimeProfileBlocked',
        evaluation: 'awaitingEvaluation',
        gameplay: 'gameplayBlocked',
        blockers,
      },
    };
    onUpsert({
      id: `person:${personId}`,
      kind: roleKind === 'player' ? 'player' : roleKind === 'staffMember' ? 'staff' : 'coach',
      operation: existing ? 'edit' : 'create',
      targetId: personId,
      label: person.knownName || person.fullName,
      summary: `${knownFields.length} fatos preservados · avaliação ausente`,
      patches: [
        {
          operation: existing ? 'replace' : 'add',
          entityKind: 'person',
          targetId: personId,
          entity: { kind: 'person', value: person },
          reason: `${existing ? 'Edição' : 'Importação'} de identidade factual parcial no Creator Studio`,
        },
      ],
      asset: null,
    });
  };

  return (
    <form
      className="studio-inspector-form factual-person-editor"
      onSubmit={(event) => event.preventDefault()}
    >
      <header>
        <h3>{labels.title}</h3>
        <p>Fatos desconhecidos permanecem vazios. Nenhuma avaliação esportiva é gerada.</p>
      </header>

      <div aria-label="Estado da pessoa" className="factual-status-strip">
        <span>Fatos importados</span>
        <span>Identidade parcial</span>
        <span>Avaliação pendente</span>
        <span>Bloqueada para gameplay</span>
      </div>

      <div className="data-editor-form-grid">
        <label>
          Nome factual
          <input
            autoFocus
            maxLength={160}
            onChange={(event) => setFullName(event.target.value)}
            value={fullName}
          />
        </label>
        <label>
          Nome conhecido <small>Não informado quando vazio</small>
          <input
            maxLength={160}
            onChange={(event) => setKnownName(event.target.value)}
            value={knownName}
          />
        </label>
        <label>
          {labels.roleId}
          <input
            maxLength={160}
            onChange={(event) => setRoleId(event.target.value)}
            value={roleId}
          />
        </label>
        <label>
          Cargo ou função <small>Não informado quando vazio</small>
          <input
            maxLength={160}
            onChange={(event) => setRoleTitle(event.target.value)}
            value={roleTitle}
          />
        </label>
        <label>
          Clube
          <select onChange={(event) => setClubId(event.target.value)} value={clubId}>
            <option value="">Não informado</option>
            {world.clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nascimento <small>Desconhecido quando vazio</small>
          <input
            onChange={(event) => setBirthDate(event.target.value)}
            type="date"
            value={birthDate}
          />
        </label>
        <label>
          Nacionalidade
          <select onChange={(event) => setNationalityId(event.target.value)} value={nationalityId}>
            <option value="">Desconhecida</option>
            {world.nations.map((nation) => (
              <option key={nation.id} value={nation.id}>
                {nation.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Segunda nacionalidade
          <select
            onChange={(event) => setSecondNationalityId(event.target.value)}
            value={secondNationalityId}
          >
            <option value="">Não informada</option>
            {world.nations.map((nation) => (
              <option key={nation.id} value={nation.id}>
                {nation.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Altura (cm) <small>Desconhecida quando vazia</small>
          <input
            max={250}
            min={100}
            onChange={(event) => setHeightCm(event.target.value)}
            type="number"
            value={heightCm}
          />
        </label>
        <label>
          Peso (kg) <small>Desconhecido quando vazio</small>
          <input
            max={250}
            min={30}
            onChange={(event) => setWeightKg(event.target.value)}
            type="number"
            value={weightKg}
          />
        </label>
        {roleKind === 'player' && (
          <>
            <label>
              Pé preferido
              <select
                onChange={(event) => setPreferredFoot(event.target.value as PreferredFoot | '')}
                value={preferredFoot}
              >
                <option value="">Desconhecido</option>
                <option value="left">Esquerdo</option>
                <option value="right">Direito</option>
                <option value="both">Ambos</option>
              </select>
            </label>
            <label>
              Posição detalhada
              <select
                onChange={(event) => setPosition(event.target.value as Position | '')}
                value={position}
              >
                <option value="">Desconhecida</option>
                {positions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Número <small>Não informado quando vazio</small>
              <input
                max={255}
                min={1}
                onChange={(event) => setShirtNumber(event.target.value)}
                type="number"
                value={shirtNumber}
              />
            </label>
          </>
        )}
      </div>

      <fieldset className="factual-provenance-fields">
        <legend>Proveniência</legend>
        <label>
          Fonte{' '}
          <input
            maxLength={500}
            onChange={(event) => setSource(event.target.value)}
            value={source}
          />
        </label>
        <label>
          ID na fonte{' '}
          <input
            maxLength={160}
            onChange={(event) => setSourceRecordId(event.target.value)}
            value={sourceRecordId}
          />
        </label>
        <label>
          Estado{' '}
          <select
            onChange={(event) =>
              setVerification(event.target.value as ProvenanceVerificationStatus)
            }
            value={verification}
          >
            <option value="pending">Verificação pendente</option>
            <option value="verified">Verificado</option>
            <option value="disputed">Divergente</option>
          </select>
        </label>
        <label>
          Sistema externo{' '}
          <input
            maxLength={120}
            onChange={(event) => setExternalSource(event.target.value)}
            value={externalSource}
          />
        </label>
        <label>
          ID externo{' '}
          <input
            maxLength={160}
            onChange={(event) => setExternalId(event.target.value)}
            value={externalId}
          />
        </label>
      </fieldset>

      <p className="factual-state-help">
        <strong>Desconhecido</strong> é um fato ausente; <strong>Não avaliado</strong> é uma análise
        esportiva ainda não realizada; <strong>Não aplicável</strong> não pertence ao papel;{' '}
        <strong>Verificação pendente</strong> identifica um fato ainda não confirmado.
      </p>
      <Button
        disabled={!fullName.trim() || !roleId.trim() || !source.trim()}
        onClick={save}
        variant="primary"
      >
        Salvar fatos
      </Button>
      <small>Autor da alteração: {author}</small>
    </form>
  );
}
