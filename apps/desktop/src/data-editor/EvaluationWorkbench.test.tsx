import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  EVALUATION_METHODOLOGY_VERSION,
  EvaluationWorkbench,
  evaluationRecordsFromWorld,
} from './EvaluationWorkbench.js';
import type { ModAuthoringWorld } from './types.js';

const world: ModAuthoringWorld = {
  clubs: [
    {
      id: 'club.synthetic',
      name: 'Clube Sintético',
      shortName: 'CS',
      city: 'Cidade Fictícia',
      primaryColor: '#287d63',
    },
  ],
  people: [
    {
      personId: 'synthetic.player.alpha',
      externalIds: [],
      fullName: 'Atleta Sintético Alpha',
      knownName: 'Alpha',
      birthDate: null,
      heightCm: null,
      weightKg: null,
      preferredFoot: null,
      nationalityId: null,
      secondNationalityId: null,
      detailedPosition: 'CM',
      shirtNumber: null,
      contract: null,
      roles: [
        {
          roleId: 'role.synthetic.player.alpha',
          kind: 'player',
          clubId: 'club.synthetic',
          title: 'Jogador',
        },
      ],
      provenance: [
        {
          source: 'Fonte factual sintética',
          sourceRecordId: 'fixture-1',
          observedAt: '2026-07-19',
          verificationStatus: 'verified',
          fields: ['fullName', 'detailedPosition'],
        },
      ],
      readiness: {
        identity: 'partialFactualIdentity',
        structural: 'structurallyValid',
        runtimeProfile: 'runtimeProfileBlocked',
        evaluation: 'awaitingEvaluation',
        gameplay: 'gameplayBlocked',
        blockers: ['player.evaluation_missing'],
      },
    },
  ],
  players: [],
  playerProfiles: [],
  coaches: [],
  nations: [],
  regions: [],
  cities: [],
  stadiums: [],
  competitions: [],
  activeClubId: 'club.synthetic',
};

describe('EvaluationWorkbench', () => {
  it('keeps facts read-only and requires evidence plus review before approval', () => {
    const onOpenFactual = vi.fn();
    render(<EvaluationWorkbench onOpenFactual={onOpenFactual} world={world} />);

    expect(screen.getByRole('heading', { name: 'Avaliações' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Fonte factual sintética')).toBeInstanceOf(HTMLElement);
    expect(
      screen.getByText('Somente leitura. Avaliações nunca sobrescrevem estes campos.'),
    ).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Gameplay bloqueado')).toBeInstanceOf(HTMLElement);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir entidade factual' }));
    expect(onOpenFactual).toHaveBeenCalledWith('player', 'synthetic.player.alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar para revisão' }));
    expect(screen.getAllByText('Evidência insuficiente').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('combobox', { name: 'Representação' }), {
      target: { value: 'range' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Mínimo' }), {
      target: { value: '68' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Máximo' }), {
      target: { value: '74' },
    });
    expect(
      screen.getByText(/O ponto central não será apresentado como valor exato/u),
    ).toBeInstanceOf(HTMLElement);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar evidência' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para revisão' }));
    expect(screen.getAllByText('Em revisão').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    expect(screen.getAllByText('Aprovada').length).toBeGreaterThan(0);
    expect(screen.getByText('Avaliação mínima aprovada')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Avaliação aprovada.')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/Confiança mede a avaliação, não a qualidade/u)).toBeInstanceOf(
      HTMLElement,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como desatualizada' }));
    expect(screen.getAllByText('Desatualizada').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Criar reavaliação' }));
    expect(screen.getAllByText('Rascunho').length).toBeGreaterThan(0);
    expect(screen.getByText('Nova revisão criada sem sobrescrever o histórico.')).toBeInstanceOf(
      HTMLElement,
    );
  });

  it('runs import dry-run by entity ID, applies drafts and rolls back', () => {
    render(<EvaluationWorkbench onOpenFactual={vi.fn()} world={world} />);
    fireEvent.click(screen.getByRole('button', { name: 'Importar avaliações' }));
    const source = screen.getByRole('textbox', { name: 'Conteúdo da importação' });

    fireEvent.change(source, {
      target: {
        value: JSON.stringify([
          {
            entityId: 'missing.entity',
            methodologyVersion: EVALUATION_METHODOLOGY_VERSION,
            origin: 'Fixture sintética',
            assessedAt: '2026-07-19',
            minimum: 60,
            maximum: 70,
          },
        ]),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Executar dry run' }));
    expect(screen.getByText('Linha 1: entityId inexistente.')).toBeInstanceOf(HTMLElement);
    expect(
      screen.getByRole('button', { name: 'Aplicar como rascunho' }).hasAttribute('disabled'),
    ).toBe(true);

    fireEvent.change(source, {
      target: {
        value: JSON.stringify([
          {
            entityId: 'synthetic.player.alpha',
            methodologyVersion: EVALUATION_METHODOLOGY_VERSION,
            origin: 'Fixture sintética',
            assessedAt: '2026-07-19',
            minimum: 65,
            maximum: 72,
          },
        ]),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Executar dry run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar como rascunho' }));
    expect(screen.getAllByText('Rascunho').length).toBeGreaterThan(0);
    expect(screen.getByText(/Nenhuma avaliação foi aprovada automaticamente/u)).toBeInstanceOf(
      HTMLElement,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer importação' }));
    expect(screen.getByText('Rollback concluído.')).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByText('Não avaliada').length).toBeGreaterThan(0);
  });

  it('offers queues, filters and only safe bulk operations', () => {
    const records = evaluationRecordsFromWorld(world);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      entityId: 'synthetic.player.alpha',
      status: 'notEvaluated',
      factualPosition: 'CM',
    });

    render(<EvaluationWorkbench onOpenFactual={vi.fn()} world={world} />);
    const queues = screen.getByRole('navigation', { name: 'Filas de avaliação' });
    for (const label of [
      'Não avaliados',
      'Evidência insuficiente',
      'Em revisão',
      'Aprovados',
      'Desatualizados',
      'Com conflitos',
      'Bloqueados para gameplay',
    ]) {
      expect(within(queues).getByRole('button', { name: new RegExp(label, 'u') })).toBeInstanceOf(
        HTMLElement,
      );
    }

    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Alpha' }));
    const bulk = screen.getByRole('toolbar', { name: 'Edição em massa segura' });
    expect(within(bulk).getByRole('button', { name: 'Aplicar metodologia' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(within(bulk).queryByRole('button', { name: /OVR/iu })).toBeNull();
  });

  it('bounds the initial DOM window for a thousand factual people', () => {
    const basePerson = world.people?.[0];
    if (!basePerson) throw new Error('fixture person missing');
    const largeWorld: ModAuthoringWorld = {
      ...world,
      people: Array.from({ length: 1_000 }, (_, index) => ({
        ...basePerson,
        personId: `synthetic.player.${index}`,
        fullName: `Atleta Sintético ${index}`,
        knownName: `Sintético ${index}`,
        roles: [
          {
            ...basePerson.roles[0]!,
            roleId: `synthetic.role.${index}`,
          },
        ],
      })),
    };
    render(<EvaluationWorkbench onOpenFactual={vi.fn()} world={largeWorld} />);

    expect(screen.getByRole('button', { name: /Carregar mais · 880 restantes/u })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(120);
  });

  it('preserves authored state without leaving hidden workbench content in the DOM', () => {
    const { rerender } = render(
      <EvaluationWorkbench isActive onOpenFactual={vi.fn()} world={world} />,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Representação' }), {
      target: { value: 'range' },
    });

    rerender(<EvaluationWorkbench isActive={false} onOpenFactual={vi.fn()} world={world} />);
    expect(screen.queryByRole('heading', { name: 'Avaliações' })).toBeNull();
    expect(screen.queryByText('Alpha')).toBeNull();

    rerender(<EvaluationWorkbench isActive onOpenFactual={vi.fn()} world={world} />);
    expect(
      (screen.getByRole('combobox', { name: 'Representação' }) as HTMLSelectElement).value,
    ).toBe('range');
  });
});
