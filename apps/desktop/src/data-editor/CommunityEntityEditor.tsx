import { Icon } from '@rivallo/icons';
import { useEffect, useMemo, useState } from 'react';

import type { Club, Player, Position } from '../matchday/types.js';
import { Button } from '../ui/primitives/actions.js';
import type {
  AuthoringAssetUpload,
  AuthoringCoachProfile,
  AuthoringPlayerProfile,
  CommunityChange,
  GeneratedPackagePatch,
  ModAuthoringWorld,
} from './types.js';

interface CommunityEntityEditorProps {
  readonly world: ModAuthoringWorld;
  readonly author: string;
  readonly onUpsert: (change: CommunityChange) => void;
}

type EntityKind = CommunityChange['kind'];
type EditorMode = CommunityChange['operation'];

const positions: readonly Position[] = ['GK', 'RB', 'CB', 'LB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST'];
const coachAttributeLabels: Readonly<Record<string, string>> = {
  tactical: 'Tática',
  preparation: 'Preparação',
  adaptability: 'Adaptabilidade',
  decisionMaking: 'Decisões',
  technicalDevelopment: 'Desenvolvimento técnico',
  physicalDevelopment: 'Desenvolvimento físico',
  mentalDevelopment: 'Desenvolvimento mental',
  tacticalDevelopment: 'Desenvolvimento tático',
  youthDevelopment: 'Formação de jovens',
  motivation: 'Motivação',
  communication: 'Comunicação',
  discipline: 'Disciplina',
  peopleManagement: 'Gestão de pessoas',
  abilityJudgement: 'Avaliação de capacidade',
  potentialJudgement: 'Avaliação de potencial',
};
const outfieldAttributeLabels = {
  finishing: 'Finalização',
  technique: 'Técnica',
  passing: 'Passe',
  tackling: 'Desarme',
  physical: 'Físico',
  pace: 'Velocidade',
} as const;
const goalkeeperAttributeLabels = {
  reaction: 'Reação',
  positioning: 'Posicionamento',
  handling: 'Manejo',
  mobility: 'Mobilidade',
  rushingOut: 'Saídas',
  distribution: 'Distribuição',
} as const;

const defaultPlayerAttributes = (position: Position): Record<string, number> =>
  Object.fromEntries(
    Object.keys(position === 'GK' ? goalkeeperAttributeLabels : outfieldAttributeLabels).map(
      (key) => [key, 50],
    ),
  );

const slug = (value: string, fallback = 'conteudo') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || fallback;

const ageFromBirthDate = (birthDate: string) => {
  const born = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(born.getTime())) return 18;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  if (
    today.getMonth() < born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())
  ) {
    age -= 1;
  }
  return Math.max(15, Math.min(85, age));
};

const patch = (
  operation: 'add' | 'replace',
  entityKind: GeneratedPackagePatch['entityKind'],
  targetId: string,
  kind: string,
  value: unknown,
  label: string,
): GeneratedPackagePatch => ({
  operation,
  entityKind,
  targetId,
  entity: { kind, value },
  reason: `${operation === 'add' ? 'Criação' : 'Edição'} comunitária de ${label}`,
});

const fileBytes = (file: File) =>
  new Promise<Uint8Array>((resolve, reject) => {
    if (typeof file.arrayBuffer === 'function') {
      file.arrayBuffer().then((value) => resolve(new Uint8Array(value)), reject);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Não foi possível ler a imagem.'));
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(file);
  });

interface AssetPickerProps {
  readonly asset: AuthoringAssetUpload | null;
  readonly entityId: string;
  readonly kind: AuthoringAssetUpload['kind'];
  readonly label: string;
  readonly author: string;
  readonly onChange: (asset: AuthoringAssetUpload | null) => void;
}

function AssetPicker({ asset, entityId, kind, label, author, onChange }: AssetPickerProps) {
  const [error, setError] = useState('');
  const source = useMemo(() => {
    if (!asset || typeof URL.createObjectURL !== 'function') return null;
    return URL.createObjectURL(new Blob([new Uint8Array(asset.bytes)], { type: asset.mediaType }));
  }, [asset]);

  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );

  const choose = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 16 * 1024 * 1024
    ) {
      setError('Use PNG, JPEG ou WebP com até 16 MB.');
      return;
    }
    const mediaType = file.type as AuthoringAssetUpload['mediaType'];
    const extension =
      mediaType === 'image/png' ? 'png' : mediaType === 'image/jpeg' ? 'jpeg' : 'webp';
    const safeEntity = slug(entityId.replaceAll('.', '-'));
    onChange({
      id: `asset.${safeEntity}.${kind}`,
      entityId,
      kind,
      path: `assets/${kind}/${safeEntity}.${extension}`,
      mediaType,
      bytes: [...(await fileBytes(file))],
      provenance: `Imagem adicionada por ${author.trim() || 'autor comunitário'}`,
      rights: 'Conteúdo fornecido pelo autor do mod',
    });
  };

  return (
    <div className="community-media-picker">
      <div aria-label={`Prévia: ${label}`} role="img">
        {source ? (
          <img alt="" src={source} />
        ) : (
          <Icon name={kind === 'clubCrest' ? 'club' : 'staff'} size={24} />
        )}
      </div>
      <strong>{label}</strong>
      <p>Opcional. A imagem fica dentro do pacote e nunca é enviada para a internet.</p>
      <label className="community-media-picker__action">
        {asset ? 'Trocar imagem' : 'Adicionar imagem'}
        <input
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => void choose(event.target.files?.[0])}
          type="file"
        />
      </label>
      {asset && (
        <button onClick={() => onChange(null)} type="button">
          Remover
        </button>
      )}
      <small>PNG, JPEG ou WebP · até 16 MB</small>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

const defaultClub = (): Club => ({
  id: '',
  name: '',
  shortName: '',
  city: '',
  primaryColor: '#35c88a',
  countryCode: 'BRA',
  competitionName: null,
  stadiumName: null,
  historySummary: null,
});

interface PlayerDraft {
  fullName: string;
  knownName: string;
  clubId: string;
  nationality: string;
  birthDate: string;
  shirtNumber: number;
  position: Position;
  heightCm: number;
  weightKg: number;
  preferredFoot: 'left' | 'right';
  squadRole: 'keyPlayer' | 'firstTeam' | 'rotation' | 'prospect' | 'backup';
  currentAbility: number;
  potential: number;
  attributes: Record<string, number>;
}

const defaultPlayer = (clubId: string): PlayerDraft => ({
  fullName: '',
  knownName: '',
  clubId,
  nationality: 'BRA',
  birthDate: '2000-01-01',
  shirtNumber: 20,
  position: 'CM',
  heightCm: 178,
  weightKg: 74,
  preferredFoot: 'right',
  squadRole: 'rotation',
  currentAbility: 55,
  potential: 65,
  attributes: {
    ...defaultPlayerAttributes('CM'),
    technique: 55,
    passing: 55,
    physical: 55,
    pace: 55,
  },
});

const playerDraftFrom = (
  player: Player,
  fallbackClubId: string,
  profile?: AuthoringPlayerProfile,
): PlayerDraft => ({
  fullName: profile?.identity.fullName ?? player.name,
  knownName: profile?.identity.knownName ?? player.shortName,
  clubId: profile?.identity.clubId ?? fallbackClubId,
  nationality: profile?.identity.nationality ?? player.nationality,
  birthDate: profile?.identity.birthDate ?? `${new Date().getFullYear() - player.age}-01-01`,
  shirtNumber: player.shirtNumber,
  position: player.position,
  heightCm: profile?.heightCm ?? player.heightCm,
  weightKg: profile?.weightKg ?? 74,
  preferredFoot: (profile?.preferredFoot ?? player.preferredFoot) === 'left' ? 'left' : 'right',
  squadRole: (profile?.squadRole ?? player.squadRole) as PlayerDraft['squadRole'],
  currentAbility: player.rating,
  potential: profile?.internalPotential ?? player.potentialRating,
  attributes: profile?.attributes
    ? (Object.fromEntries(
        Object.entries(profile.attributes).filter(([key]) => key !== 'model'),
      ) as Record<string, number>)
    : defaultPlayerAttributes(player.position),
});

interface CoachDraft {
  fullName: string;
  knownName: string;
  clubId: string;
  nationality: string;
  birthDate: string;
  role: string;
  reputation: number;
  qualification: string;
  experienceYears: number;
  style: string;
  preferredFormations: string;
  specialties: string;
  attributes: Record<string, number>;
}

const defaultCoachAttributes = () =>
  Object.fromEntries(Object.keys(coachAttributeLabels).map((key) => [key, 50]));
const defaultCoach = (clubId: string): CoachDraft => ({
  fullName: '',
  knownName: '',
  clubId,
  nationality: 'BRA',
  birthDate: '1985-01-01',
  role: 'Treinador principal',
  reputation: 50,
  qualification: 'Licença nacional',
  experienceYears: 5,
  style: 'Equilibrado',
  preferredFormations: '4-3-3',
  specialties: '',
  attributes: defaultCoachAttributes(),
});

const coachDraftFrom = (coach: AuthoringCoachProfile): CoachDraft => ({
  fullName: coach.identity.fullName,
  knownName: coach.identity.knownName,
  clubId: coach.identity.clubId,
  nationality: coach.identity.nationality,
  birthDate: coach.identity.birthDate,
  role: coach.role,
  reputation: coach.reputation,
  qualification: coach.qualification,
  experienceYears: coach.experienceYears,
  style: coach.style,
  preferredFormations: coach.preferredFormations.join(', '),
  specialties: coach.specialties.join(', '),
  attributes: { ...coach.attributes },
});

function AttributeGrid({
  values,
  labels,
  onChange,
}: {
  readonly values: Readonly<Record<string, number>>;
  readonly labels: Readonly<Record<string, string>>;
  readonly onChange: (values: Record<string, number>) => void;
}) {
  return (
    <div className="community-attribute-grid">
      {Object.entries(labels).map(([key, label]) => (
        <label key={key}>
          <span>{label}</span>
          <input
            aria-label={label}
            max={100}
            min={1}
            onChange={(event) => onChange({ ...values, [key]: Number(event.target.value) })}
            type="range"
            value={values[key] ?? 50}
          />
          <output>{values[key] ?? 50}</output>
        </label>
      ))}
    </div>
  );
}

export function CommunityEntityEditor({ world, author, onUpsert }: CommunityEntityEditorProps) {
  const [kind, setKind] = useState<EntityKind>('club');
  const [mode, setMode] = useState<EditorMode>('create');
  const [selectedClubId, setSelectedClubId] = useState(world.clubs[0]?.id ?? '');
  const [selectedPlayerId, setSelectedPlayerId] = useState(world.players[0]?.id ?? '');
  const [selectedCoachId, setSelectedCoachId] = useState(world.coaches[0]?.identity.entityId ?? '');
  const [club, setClub] = useState<Club>(defaultClub());
  const [player, setPlayer] = useState<PlayerDraft>(defaultPlayer(world.activeClubId));
  const [coach, setCoach] = useState<CoachDraft>(defaultCoach(world.activeClubId));
  const [asset, setAsset] = useState<AuthoringAssetUpload | null>(null);
  const canEditKind =
    kind === 'club'
      ? world.clubs.length > 0
      : kind === 'player'
        ? world.players.length > 0
        : world.coaches.length > 0;

  useEffect(() => {
    if (mode === 'edit' && !canEditKind) setMode('create');
  }, [canEditKind, mode]);

  useEffect(() => {
    setAsset(null);
    if (mode === 'create') {
      setClub(defaultClub());
      setPlayer(defaultPlayer(world.activeClubId));
      setCoach(defaultCoach(world.activeClubId));
      return;
    }
    const nextClub = world.clubs.find((candidate) => candidate.id === selectedClubId);
    const nextPlayer = world.players.find((candidate) => candidate.id === selectedPlayerId);
    const nextCoach = world.coaches.find(
      (candidate) => candidate.identity.entityId === selectedCoachId,
    );
    if (kind === 'club' && nextClub) setClub(nextClub);
    if (kind === 'player' && nextPlayer) {
      setPlayer(
        playerDraftFrom(
          nextPlayer,
          world.activeClubId,
          world.playerProfiles.find((candidate) => candidate.identity.entityId === nextPlayer.id),
        ),
      );
    }
    if (kind === 'coach' && nextCoach) setCoach(coachDraftFrom(nextCoach));
  }, [kind, mode, selectedClubId, selectedCoachId, selectedPlayerId, world]);

  const selectedClub = (clubId: string) =>
    world.clubs.find((candidate) => candidate.id === clubId) ?? world.clubs[0];
  const entityId =
    mode === 'edit'
      ? kind === 'club'
        ? selectedClubId
        : kind === 'player'
          ? selectedPlayerId
          : selectedCoachId
      : `community.${slug(author, 'autor')}.${kind}.${slug(kind === 'club' ? club.name : kind === 'player' ? player.knownName : coach.knownName)}`;

  const addClub = () => {
    const next = {
      ...club,
      id: entityId,
      shortName: club.shortName.trim().toUpperCase(),
      historySummary: club.historySummary?.trim() || null,
    };
    onUpsert({
      id: `club:${entityId}`,
      kind: 'club',
      operation: mode,
      targetId: entityId,
      label: next.name,
      summary: `${next.city} · ${next.shortName}${asset ? ' · com escudo' : ''}`,
      patches: [
        patch(mode === 'create' ? 'add' : 'replace', 'club', entityId, 'club', next, next.name),
      ],
      asset: asset
        ? {
            ...asset,
            entityId,
            id: `asset.${slug(entityId)}.clubCrest`,
            path: `assets/clubCrest/${slug(entityId)}.${asset.mediaType === 'image/png' ? 'png' : asset.mediaType === 'image/jpeg' ? 'jpeg' : 'webp'}`,
          }
        : null,
    });
  };

  const addPlayer = () => {
    const targetClub = selectedClub(player.clubId);
    if (!targetClub) return;
    const age = ageFromBirthDate(player.birthDate);
    const matchdayPlayer: Player = {
      id: entityId,
      name: player.fullName.trim(),
      shortName: player.knownName.trim(),
      shirtNumber: player.shirtNumber,
      position: player.position,
      age,
      nationality: player.nationality,
      heightCm: player.heightCm,
      preferredFoot: player.preferredFoot,
      squadRole: player.squadRole,
      rating: player.currentAbility,
      potentialRating: player.potential,
      matchFitness: 100,
      morale: 70,
      condition: 100,
      appearances: 0,
      goals: 0,
      assists: 0,
      averageRating: 0,
      selected: false,
    };
    const profile = {
      identity: {
        entityId,
        fullName: player.fullName.trim(),
        knownName: player.knownName.trim(),
        nationality: player.nationality,
        birthDate: player.birthDate,
        age,
        clubId: targetClub.id,
        clubName: targetClub.name,
        clubShortName: targetClub.shortName,
        clubPrimaryColor: targetClub.primaryColor,
      },
      shirtNumber: player.shirtNumber,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      preferredFoot: player.preferredFoot,
      squadRole: player.squadRole,
      naturalPosition: player.position,
      attributes: {
        model: player.position === 'GK' ? 'goalkeeper' : 'outfield',
        ...player.attributes,
      },
      internalPotential: player.potential,
      contract: {
        clubId: targetClub.id,
        startedAt: `${new Date().getFullYear()}-01-01`,
        expiresAt: `${new Date().getFullYear() + 3}-12-31`,
        squadStatus: player.squadRole,
      },
    };
    const operation = mode === 'create' ? 'add' : 'replace';
    const patches =
      targetClub.id === world.activeClubId
        ? [
            patch(
              operation,
              'matchdayPlayer',
              entityId,
              'matchdayPlayer',
              matchdayPlayer,
              player.knownName,
            ),
            patch(operation, 'playerProfile', entityId, 'playerProfile', profile, player.knownName),
          ]
        : [
            patch(
              operation,
              'externalPlayer',
              entityId,
              'externalPlayer',
              {
                profile,
                condition: null,
                matchFitness: null,
                appearances: 0,
                goals: 0,
                assists: 0,
                averageRating: null,
              },
              player.knownName,
            ),
          ];
    onUpsert({
      id: `player:${entityId}`,
      kind: 'player',
      operation: mode,
      targetId: entityId,
      label: player.knownName.trim(),
      summary: `${targetClub.name} · ${player.position} · ${player.currentAbility}/${player.potential}${asset ? ' · com foto' : ''}`,
      patches,
      asset: asset
        ? {
            ...asset,
            entityId,
            id: `asset.${slug(entityId)}.playerPortrait`,
            path: `assets/playerPortrait/${slug(entityId)}.${asset.mediaType === 'image/png' ? 'png' : asset.mediaType === 'image/jpeg' ? 'jpeg' : 'webp'}`,
          }
        : null,
    });
  };

  const addCoach = () => {
    const targetClub = selectedClub(coach.clubId);
    if (!targetClub) return;
    const profile = {
      identity: {
        entityId,
        fullName: coach.fullName.trim(),
        knownName: coach.knownName.trim(),
        nationality: coach.nationality,
        birthDate: coach.birthDate,
        age: ageFromBirthDate(coach.birthDate),
        clubId: targetClub.id,
        clubName: targetClub.name,
        clubShortName: targetClub.shortName,
        clubPrimaryColor: targetClub.primaryColor,
      },
      role: coach.role,
      reputation: coach.reputation,
      qualification: coach.qualification,
      experienceYears: coach.experienceYears,
      style: coach.style,
      preferredFormations: coach.preferredFormations
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      attributes: coach.attributes,
      specialties: coach.specialties
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      contract: {
        clubId: targetClub.id,
        startedAt: `${new Date().getFullYear()}-01-01`,
        expiresAt: `${new Date().getFullYear() + 2}-12-31`,
        squadStatus: coach.role,
      },
    };
    onUpsert({
      id: `coach:${entityId}`,
      kind: 'coach',
      operation: mode,
      targetId: entityId,
      label: coach.knownName.trim(),
      summary: `${targetClub.name} · ${coach.role}${asset ? ' · com foto' : ''}`,
      patches: [
        patch(
          mode === 'create' ? 'add' : 'replace',
          'coach',
          entityId,
          'coach',
          profile,
          coach.knownName,
        ),
      ],
      asset: asset
        ? {
            ...asset,
            entityId,
            id: `asset.${slug(entityId)}.coachPortrait`,
            path: `assets/coachPortrait/${slug(entityId)}.${asset.mediaType === 'image/png' ? 'png' : asset.mediaType === 'image/jpeg' ? 'jpeg' : 'webp'}`,
          }
        : null,
    });
  };

  const labels =
    kind === 'club'
      ? { title: club.name || 'Novo clube', media: 'Escudo do clube' }
      : kind === 'player'
        ? { title: player.knownName || 'Novo jogador', media: 'Foto do jogador' }
        : { title: coach.knownName || 'Novo treinador', media: 'Foto do treinador' };
  const valid =
    kind === 'club'
      ? Boolean(club.name.trim() && club.shortName.trim() && club.city.trim())
      : kind === 'player'
        ? Boolean(
            player.fullName.trim() &&
            player.knownName.trim() &&
            player.clubId &&
            player.potential >= player.currentAbility,
          )
        : Boolean(coach.fullName.trim() && coach.knownName.trim() && coach.clubId);

  return (
    <div className="community-studio">
      <div className="community-studio__toolbar">
        <div aria-label="Conteúdo que deseja criar" className="community-kind-tabs" role="tablist">
          {(['club', 'player', 'coach'] as const).map((item) => (
            <button
              aria-selected={kind === item}
              key={item}
              onClick={() => setKind(item)}
              role="tab"
              type="button"
            >
              <Icon name={item === 'club' ? 'club' : 'staff'} size={20} />
              <span>{item === 'club' ? 'Clube' : item === 'player' ? 'Jogador' : 'Treinador'}</span>
            </button>
          ))}
        </div>
        <div aria-label="Criar ou editar" className="community-mode-switch" role="radiogroup">
          <button
            aria-checked={mode === 'create'}
            onClick={() => setMode('create')}
            role="radio"
            type="button"
          >
            Criar novo
          </button>
          <button
            aria-checked={mode === 'edit'}
            disabled={!canEditKind}
            onClick={() => setMode('edit')}
            role="radio"
            title={!canEditKind ? 'Não há itens desta categoria para editar' : undefined}
            type="button"
          >
            Editar existente
          </button>
        </div>
      </div>

      {mode === 'edit' && (
        <label className="community-target-picker">
          <span>Quem você quer editar?</span>
          {kind === 'club' ? (
            <select
              onChange={(event) => setSelectedClubId(event.target.value)}
              value={selectedClubId}
            >
              {world.clubs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : kind === 'player' ? (
            <select
              onChange={(event) => setSelectedPlayerId(event.target.value)}
              value={selectedPlayerId}
            >
              {world.players.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.position}
                </option>
              ))}
            </select>
          ) : (
            <select
              onChange={(event) => setSelectedCoachId(event.target.value)}
              value={selectedCoachId}
            >
              {world.coaches.map((item) => (
                <option key={item.identity.entityId} value={item.identity.entityId}>
                  {item.identity.fullName}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      <div className="community-studio__editor">
        <AssetPicker
          asset={asset}
          author={author}
          entityId={entityId}
          kind={
            kind === 'club' ? 'clubCrest' : kind === 'player' ? 'playerPortrait' : 'coachPortrait'
          }
          label={labels.media}
          onChange={setAsset}
        />
        <div className="community-studio__fields">
          <header>
            <h3>{labels.title}</h3>
            <p>Preencha o essencial agora. Os detalhes avançados ficam organizados abaixo.</p>
          </header>
          {kind === 'club' && (
            <>
              <div className="data-editor-form-grid">
                <label>
                  Nome completo
                  <input
                    autoFocus
                    maxLength={100}
                    onChange={(event) => setClub({ ...club, name: event.target.value })}
                    value={club.name}
                  />
                </label>
                <label>
                  Sigla
                  <input
                    maxLength={6}
                    onChange={(event) =>
                      setClub({ ...club, shortName: event.target.value.toUpperCase() })
                    }
                    value={club.shortName}
                  />
                </label>
                <label>
                  Cidade
                  <select
                    onChange={(event) => {
                      const city = world.cities?.find((item) => item.id === event.target.value);
                      setClub({
                        ...club,
                        cityId: city?.id ?? null,
                        city: city?.name ?? '',
                        nationId: city?.nationId ?? club.nationId,
                      });
                    }}
                    value={club.cityId ?? ''}
                  >
                    <option value="">Selecione uma cidade</option>
                    {(world.cities ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  País
                  <select
                    onChange={(event) => {
                      const nation = world.nations.find((item) => item.id === event.target.value);
                      setClub({
                        ...club,
                        nationId: nation?.id ?? null,
                        countryCode: nation?.iso2 ?? null,
                      });
                    }}
                    value={club.nationId ?? ''}
                  >
                    <option value="">Selecione um país</option>
                    {world.nations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Competição
                  <select
                    onChange={(event) => {
                      const competition = world.competitions?.find(
                        (item) => item.id === event.target.value,
                      );
                      setClub({
                        ...club,
                        competitionId: competition?.id ?? null,
                        competitionName: competition?.name ?? null,
                      });
                    }}
                    value={club.competitionId ?? ''}
                  >
                    <option value="">Selecione uma competição</option>
                    {(world.competitions ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estádio
                  <select
                    onChange={(event) => {
                      const stadium = world.stadiums?.find(
                        (item) => item.id === event.target.value,
                      );
                      setClub({
                        ...club,
                        stadiumId: stadium?.id ?? null,
                        stadiumName: stadium?.name ?? null,
                      });
                    }}
                    value={club.stadiumId ?? ''}
                  >
                    <option value="">Selecione um estádio</option>
                    {(world.stadiums ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cor principal
                  <span className="color-field">
                    <input
                      aria-label="Escolher cor principal"
                      onChange={(event) => setClub({ ...club, primaryColor: event.target.value })}
                      type="color"
                      value={club.primaryColor}
                    />
                    <input
                      aria-label="Cor principal"
                      onChange={(event) => setClub({ ...club, primaryColor: event.target.value })}
                      value={club.primaryColor}
                    />
                  </span>
                </label>
              </div>
              <section className="community-history-editor" aria-labelledby="club-history-title">
                <div>
                  <h4 id="club-history-title">História do clube</h4>
                  <span>{club.historySummary?.length ?? 0}/1200</span>
                </div>
                <p>Escreva um resumo curto sobre a origem, trajetória e identidade do clube.</p>
                <textarea
                  aria-label="História do clube"
                  maxLength={1200}
                  onChange={(event) =>
                    setClub({ ...club, historySummary: event.target.value || null })
                  }
                  placeholder="Ex.: fundação, relação com a cidade e identidade esportiva."
                  rows={6}
                  value={club.historySummary ?? ''}
                />
                <aside aria-label="Prévia da história do clube">
                  <strong>Prévia</strong>
                  <p>{club.historySummary?.trim() || 'História não informada.'}</p>
                </aside>
              </section>
              <Button disabled={!valid} onClick={addClub} variant="primary">
                {mode === 'create' ? 'Adicionar clube ao mod' : 'Salvar edição do clube'}
              </Button>
            </>
          )}
          {kind === 'player' && (
            <>
              <div className="data-editor-form-grid">
                <label>
                  Nome completo
                  <input
                    autoFocus
                    onChange={(event) => setPlayer({ ...player, fullName: event.target.value })}
                    value={player.fullName}
                  />
                </label>
                <label>
                  Nome conhecido
                  <input
                    onChange={(event) => setPlayer({ ...player, knownName: event.target.value })}
                    value={player.knownName}
                  />
                </label>
                <label>
                  Clube
                  <select
                    aria-label="Clube"
                    disabled={mode === 'edit'}
                    onChange={(event) => setPlayer({ ...player, clubId: event.target.value })}
                    value={player.clubId}
                  >
                    {world.clubs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {mode === 'edit' && <small>O clube de origem é preservado nesta edição.</small>}
                </label>
                <label>
                  Nacionalidade
                  <select
                    onChange={(event) => setPlayer({ ...player, nationality: event.target.value })}
                    value={player.nationality}
                  >
                    {world.nations.map((item) => (
                      <option key={item.id} value={item.iso2}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Data de nascimento
                  <input
                    onChange={(event) => setPlayer({ ...player, birthDate: event.target.value })}
                    type="date"
                    value={player.birthDate}
                  />
                </label>
                <label>
                  Posição
                  <select
                    onChange={(event) =>
                      setPlayer({
                        ...player,
                        position: event.target.value as Position,
                        attributes: defaultPlayerAttributes(event.target.value as Position),
                      })
                    }
                    value={player.position}
                  >
                    {positions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Camisa
                  <input
                    max={99}
                    min={1}
                    onChange={(event) =>
                      setPlayer({ ...player, shirtNumber: Number(event.target.value) })
                    }
                    type="number"
                    value={player.shirtNumber}
                  />
                </label>
                <label>
                  Altura (cm)
                  <input
                    max={220}
                    min={145}
                    onChange={(event) =>
                      setPlayer({ ...player, heightCm: Number(event.target.value) })
                    }
                    type="number"
                    value={player.heightCm}
                  />
                </label>
                <label>
                  Peso (kg)
                  <input
                    max={130}
                    min={45}
                    onChange={(event) =>
                      setPlayer({ ...player, weightKg: Number(event.target.value) })
                    }
                    type="number"
                    value={player.weightKg}
                  />
                </label>
                <label>
                  Pé preferido
                  <select
                    onChange={(event) =>
                      setPlayer({
                        ...player,
                        preferredFoot: event.target.value as PlayerDraft['preferredFoot'],
                      })
                    }
                    value={player.preferredFoot}
                  >
                    <option value="right">Direito</option>
                    <option value="left">Esquerdo</option>
                  </select>
                </label>
                <label>
                  Nível atual
                  <span className="range-field">
                    <input
                      aria-label="Nível atual"
                      max={100}
                      min={1}
                      onChange={(event) =>
                        setPlayer({
                          ...player,
                          currentAbility: Number(event.target.value),
                          potential: Math.max(player.potential, Number(event.target.value)),
                        })
                      }
                      type="range"
                      value={player.currentAbility}
                    />
                    <output>{player.currentAbility}</output>
                  </span>
                </label>
                <label>
                  Potencial
                  <span className="range-field">
                    <input
                      aria-label="Potencial"
                      max={100}
                      min={player.currentAbility}
                      onChange={(event) =>
                        setPlayer({ ...player, potential: Number(event.target.value) })
                      }
                      type="range"
                      value={player.potential}
                    />
                    <output>{player.potential}</output>
                  </span>
                </label>
              </div>
              <details className="community-advanced">
                <summary>Atributos detalhados</summary>
                <AttributeGrid
                  labels={
                    player.position === 'GK' ? goalkeeperAttributeLabels : outfieldAttributeLabels
                  }
                  onChange={(attributes) => setPlayer({ ...player, attributes })}
                  values={player.attributes}
                />
              </details>
              <Button disabled={!valid} onClick={addPlayer} variant="primary">
                {mode === 'create' ? 'Adicionar jogador ao mod' : 'Salvar edição do jogador'}
              </Button>
            </>
          )}
          {kind === 'coach' && (
            <>
              <div className="data-editor-form-grid">
                <label>
                  Nome completo
                  <input
                    autoFocus
                    onChange={(event) => setCoach({ ...coach, fullName: event.target.value })}
                    value={coach.fullName}
                  />
                </label>
                <label>
                  Nome conhecido
                  <input
                    onChange={(event) => setCoach({ ...coach, knownName: event.target.value })}
                    value={coach.knownName}
                  />
                </label>
                <label>
                  Clube
                  <select
                    onChange={(event) => setCoach({ ...coach, clubId: event.target.value })}
                    value={coach.clubId}
                  >
                    {world.clubs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nacionalidade
                  <select
                    onChange={(event) => setCoach({ ...coach, nationality: event.target.value })}
                    value={coach.nationality}
                  >
                    {world.nations.map((item) => (
                      <option key={item.id} value={item.iso2}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Data de nascimento
                  <input
                    onChange={(event) => setCoach({ ...coach, birthDate: event.target.value })}
                    type="date"
                    value={coach.birthDate}
                  />
                </label>
                <label>
                  Cargo
                  <input
                    onChange={(event) => setCoach({ ...coach, role: event.target.value })}
                    value={coach.role}
                  />
                </label>
                <label>
                  Qualificação
                  <input
                    onChange={(event) => setCoach({ ...coach, qualification: event.target.value })}
                    value={coach.qualification}
                  />
                </label>
                <label>
                  Experiência (anos)
                  <input
                    max={60}
                    min={0}
                    onChange={(event) =>
                      setCoach({ ...coach, experienceYears: Number(event.target.value) })
                    }
                    type="number"
                    value={coach.experienceYears}
                  />
                </label>
                <label>
                  Estilo
                  <input
                    onChange={(event) => setCoach({ ...coach, style: event.target.value })}
                    value={coach.style}
                  />
                </label>
                <label>
                  Formações preferidas
                  <input
                    onChange={(event) =>
                      setCoach({ ...coach, preferredFormations: event.target.value })
                    }
                    placeholder="4-3-3, 4-2-3-1"
                    value={coach.preferredFormations}
                  />
                </label>
                <label className="data-editor-form-grid__wide">
                  Especialidades
                  <input
                    onChange={(event) => setCoach({ ...coach, specialties: event.target.value })}
                    placeholder="Jovens, bolas paradas"
                    value={coach.specialties}
                  />
                </label>
                <label>
                  Reputação
                  <span className="range-field">
                    <input
                      aria-label="Reputação"
                      max={100}
                      min={1}
                      onChange={(event) =>
                        setCoach({ ...coach, reputation: Number(event.target.value) })
                      }
                      type="range"
                      value={coach.reputation}
                    />
                    <output>{coach.reputation}</output>
                  </span>
                </label>
              </div>
              <details className="community-advanced">
                <summary>Capacidades detalhadas</summary>
                <AttributeGrid
                  labels={coachAttributeLabels}
                  onChange={(attributes) => setCoach({ ...coach, attributes })}
                  values={coach.attributes}
                />
              </details>
              <Button disabled={!valid} onClick={addCoach} variant="primary">
                {mode === 'create' ? 'Adicionar treinador ao mod' : 'Salvar edição do treinador'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
