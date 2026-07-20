import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CsvImport } from './CsvImport.js';
import type { ModAuthoringWorld } from './types.js';

const world: ModAuthoringWorld = {
  clubs: [
    {
      id: 'club.synthetic',
      name: 'Clube Sintético',
      shortName: 'SYN',
      city: 'Cidade Sintética',
      primaryColor: '#237a57',
    },
  ],
  people: [],
  players: [],
  playerProfiles: [],
  coaches: [],
  nations: [],
  competitions: [],
  activeClubId: 'club.synthetic',
};

describe('CsvImport factual people', () => {
  it('imports and reimports a partial player by stable IDs without sporting defaults', async () => {
    const onImport = vi.fn();
    const { container } = render(
      <CsvImport onImport={onImport} onRollback={vi.fn()} world={world} />,
    );
    const csv = [
      'internalId,personId,roleId,externalSource,externalId,fullName,knownName,clubId,nationalityId,secondNationalityId,birthDate,position,shirtNumber,heightCm,weightKg,preferredFoot,source,sourceRecordId,verificationStatus',
      'synthetic.player.alpha,synthetic.person.alpha,synthetic.player.alpha,fixture,ext-1,Pessoa Sintética Alpha,,club.synthetic,,,,,,,,,fixture-source,record-1,pending',
      'synthetic.player.alpha,synthetic.person.alpha,synthetic.player.alpha,fixture,ext-1,Pessoa Sintética Alpha,Alpha,club.synthetic,,,,,,,,,fixture-source,record-1,pending',
    ].join('\n');
    const file = {
      name: 'partial-players.csv',
      type: 'text/csv',
      text: vi.fn().mockResolvedValue(csv),
    } as unknown as File;
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    fireEvent.change(input!, { target: { files: [file] } });

    await screen.findByText('2 registros');
    fireEvent.click(screen.getByRole('button', { name: 'Revisar e importar 2' }));

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const changes = onImport.mock.calls[0]![0];
    expect(changes).toHaveLength(2);
    expect(changes[0].patches[0]).toEqual(
      expect.objectContaining({ operation: 'add', entityKind: 'person' }),
    );
    expect(changes[1].patches[0]).toEqual(
      expect.objectContaining({ operation: 'replace', entityKind: 'person' }),
    );
    const person = changes[1].patches[0].entity.value;
    expect(person).toEqual(
      expect.objectContaining({
        personId: 'synthetic.person.alpha',
        knownName: 'Alpha',
        birthDate: null,
        heightCm: null,
        weightKg: null,
        preferredFoot: null,
        detailedPosition: null,
        provenance: [
          expect.objectContaining({
            source: 'fixture-source',
            sourceRecordId: 'record-1',
            verificationStatus: 'pending',
          }),
        ],
        readiness: expect.objectContaining({
          evaluation: 'awaitingEvaluation',
          runtimeProfile: 'runtimeProfileBlocked',
          gameplay: 'gameplayBlocked',
        }),
      }),
    );
    expect(person).not.toHaveProperty('rating');
    expect(person).not.toHaveProperty('potential');
    expect(person).not.toHaveProperty('attributes');
  });
});
