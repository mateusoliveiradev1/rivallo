import '@testing-library/dom';

import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { coachProfileFixture, exactValue, playerProfileFixture } from './test-fixtures.js';
import { ProfileScreen } from './ProfileScreen.js';

const clientMock = vi.hoisted(() => ({
  loadPlayerProfile: vi.fn(),
  loadCoachProfile: vi.fn(),
  loadClubProfile: vi.fn(),
  loadNationProfile: vi.fn(),
  searchProfiles: vi.fn(),
}));

vi.mock('../matchday/client.js', () => clientMock);

describe('ProfileScreen', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    clientMock.loadPlayerProfile.mockReset().mockResolvedValue(playerProfileFixture());
    clientMock.loadCoachProfile.mockReset().mockResolvedValue(coachProfileFixture());
    clientMock.loadClubProfile.mockReset().mockResolvedValue({
      schemaVersion: 1,
      revision: 4,
      entityId: 'aurora-fc',
      name: 'Aurora Futebol Clube',
      shortName: 'AUR',
      city: 'Porto Claro',
      primaryColor: '#35c88a',
      countryCode: 'BRA',
      competitionName: 'Liga Horizonte',
      stadiumName: null,
      currentPosition: null,
      nextFixture: null,
      form: [],
      headCoach: {
        entityId: 'coach.aurora.head',
        entityType: 'coach',
        name: 'Helena Sampaio',
        secondaryLabel: 'Treinadora principal',
        route: '/coaches/coach.aurora.head',
        nationality: 'BRA',
        clubId: 'aurora-fc',
        visualCode: 'TEC',
        perceivedRating: exactValue(76),
        confidence: 100,
        knowledgeLevel: 'ownClub',
      },
      players: [],
      staff: [],
      tactics: null,
      knowledge: playerProfileFixture().knowledge,
    });
    clientMock.loadNationProfile.mockReset().mockResolvedValue({
      schemaVersion: 1,
      revision: 4,
      entityId: 'bra',
      name: 'Brasil',
      code: 'BRA',
      confederation: 'CONMEBOL',
      clubs: [],
      players: [],
      coaches: [],
      competitions: ['Liga Horizonte'],
      knowledge: playerProfileFixture().knowledge,
    });
    clientMock.searchProfiles.mockReset().mockResolvedValue([]);
  });

  it('shows one explainable player projection across overview, roles and development', async () => {
    const user = userEvent.setup();
    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'player', entityId: 'p1' }}
        variationId="tactical-variation.primary"
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Caio Brandão' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
    expect(clientMock.loadPlayerProfile).toHaveBeenCalledWith('p1', 'tactical-variation.primary');
    expect(
      screen.getByText('Condição, forma e potencial não alteram a capacidade estrutural.'),
    ).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Por que este rating?')).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByLabelText(/OVR atual: 77/u).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/No plano atual: 78/u).length).toBeGreaterThan(0);
    expect(screen.getByText('Potencial estimado')).toBeInstanceOf(HTMLElement);
    expect(screen.getByLabelText('Confiança da projeção: 72%')).toBeInstanceOf(HTMLElement);

    await user.click(screen.getByText('Por que este rating?'));
    expect(screen.getByText('Posição e função avaliadas')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Rating calculado')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Versão da fórmula')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Fatores mais relevantes')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Pontos fortes')).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByText('Limitações').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Posições e funções' }));
    expect(screen.getByRole('heading', { name: 'Encaixe no plano' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/Encaixe mede compatibilidade/u)).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('heading', { name: 'Funções e responsabilidades' })).toBeInstanceOf(
      HTMLElement,
    );

    await user.click(screen.getByRole('tab', { name: 'Atributos' }));
    const passingDefinition = screen.getByRole('button', {
      name: 'Passe. Abrir definição e origem da avaliação',
    });
    await user.hover(passingDefinition);
    expect((await screen.findByRole('tooltip')).textContent).toMatch(
      /Qualidade e precisão.*Valor conhecido: 76.*Confiança: 94%.*Fonte: Comissão técnica/su,
    );

    await user.click(screen.getByRole('tab', { name: 'Desenvolvimento' }));
    expect(screen.getByText('Plano individual ainda não disponível')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/futura Fase 06.8/u)).toBeInstanceOf(HTMLElement);
  });

  it('keeps an external player partial and never renders an internal real value', async () => {
    clientMock.loadPlayerProfile.mockResolvedValue(
      playerProfileFixture({
        entityId: 'rv-fdv-01',
        fullName: 'Martín Gouveia',
        knownName: 'M. Gouveia',
        position: 'ST',
        nationality: 'URU',
        knowledge: 'partial',
      }),
    );
    const user = userEvent.setup();
    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'player', entityId: 'rv-fdv-01' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'M. Gouveia' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Observação parcial')).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByText('73–81').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Conhecimento' }));
    expect(screen.getByText(/valor interno/u)).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/potencial interno permanece protegido/u)).toBeInstanceOf(HTMLElement);
  });

  it('presents a coach by contextual role and separate development capabilities', async () => {
    const user = userEvent.setup();
    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'coach', entityId: 'coach.aurora.1' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Marcelo Nunes' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.getByText('RATING POR FUNÇÃO')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Tática')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Gestão humana')).toBeInstanceOf(HTMLElement);
    expect(
      screen.getAllByLabelText(/Avaliação como treinador principal: 79/u).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Reputação percebida')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('76')).toBeInstanceOf(HTMLElement);
    expect(screen.getByLabelText('Confiança cadastral: 95%')).toBeInstanceOf(HTMLElement);

    await user.click(screen.getByRole('tab', { name: 'Capacidades' }));
    const capabilities = screen
      .getByRole('heading', { name: 'Capacidades de desenvolvimento' })
      .closest('section');
    expect(capabilities).not.toBeNull();
    expect(within(capabilities!).getByText('Desenvolvimento de jovens')).toBeInstanceOf(
      HTMLElement,
    );
    expect(within(capabilities!).getByText('Aprendizagem de função')).toBeInstanceOf(HTMLElement);
    expect(within(capabilities!).getByText('Precisão de avaliação')).toBeInstanceOf(HTMLElement);
  });

  it('renders a global club profile and discovers its head coach through Commission', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={onNavigate}
        route={{ kind: 'club', entityId: 'aurora-fc' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Aurora Futebol Clube' })).toBeInstanceOf(
      HTMLElement,
    );
    expect(clientMock.loadClubProfile).toHaveBeenCalledWith('aurora-fc');
    expect(screen.getByText(/jogadores no elenco · plantel principal/u)).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.getByText('Dados internos do clube')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Reputação 76')).toBeInstanceOf(HTMLElement);
    expect(
      within(screen.getByRole('link', { name: 'Abrir perfil de Helena Sampaio' })).queryByText(
        /OVR/u,
      ),
    ).toBeNull();
    expect(await screen.findByText('Avaliação como treinador principal')).toBeInstanceOf(
      HTMLElement,
    );
    expect(screen.getByText('Reputação percebida')).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('tab', { name: 'Comissão' }));
    expect(screen.getByText('Comissão não informada')).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('tab', { name: 'Visão geral' }));
    await user.click(screen.getByRole('link', { name: 'Abrir perfil de Helena Sampaio' }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: 'coach', entityId: 'coach.aurora.head' });
  });

  it('renders a data-driven nation profile without inventing absent entities', async () => {
    const user = userEvent.setup();
    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'nation', entityId: 'bra' }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Brasil' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('CONMEBOL')).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('tab', { name: 'Clubes' }));
    expect(screen.getByText('Nenhum clube conhecido')).toBeInstanceOf(HTMLElement);
    await user.click(screen.getByRole('tab', { name: 'Competições' }));
    expect(screen.getByText('Liga Horizonte')).toBeInstanceOf(HTMLElement);
  });

  it('compares profiles through the same projection and can navigate to the selected entity', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const external = playerProfileFixture({
      entityId: 'rv-fdv-01',
      fullName: 'Martín Gouveia',
      knownName: 'M. Gouveia',
      knowledge: 'partial',
    });
    clientMock.searchProfiles.mockResolvedValue([
      {
        entityId: 'rv-fdv-01',
        entityType: 'player',
        name: 'Martín Gouveia',
        secondaryLabel: 'Ferroviário do Vale · Atacante',
        route: '/players/rv-fdv-01',
        knowledgeLevel: 'partial',
      },
    ]);
    clientMock.loadPlayerProfile
      .mockResolvedValueOnce(playerProfileFixture())
      .mockResolvedValueOnce(external);

    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={onNavigate}
        route={{ kind: 'player', entityId: 'p1' }}
      />,
    );
    await screen.findByRole('heading', { name: 'Caio Brandão' });
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar jogador' }), 'mart');
    await user.click(await screen.findByRole('button', { name: /Martín Gouveia/u }));

    expect(await screen.findByRole('heading', { name: 'M. Gouveia' })).toBeInstanceOf(HTMLElement);
    expect(screen.getAllByText('OVR atual').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Potencial estimado')).toHaveLength(3);
    expect(screen.getAllByText(/Confiança da projeção:/u).length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getByRole('button', { name: 'Abrir perfil' }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: 'player', entityId: 'rv-fdv-01' });
  });

  it('returns focus when comparison closes and never leaves a scroll lock behind', async () => {
    const user = userEvent.setup();
    render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'coach', entityId: 'coach.aurora.1' }}
      />,
    );

    await screen.findByRole('heading', { name: 'Marcelo Nunes' });
    const trigger = screen.getByRole('button', { name: 'Comparar' });
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Comparar' })),
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('changes only the contextual rating when the tactical variation changes', async () => {
    const primary = playerProfileFixture();
    const secondary = {
      ...primary,
      contextualRating: {
        ...primary.contextualRating,
        contextId: 'p1.context.secondary',
        perceived: exactValue(72),
      },
    };
    clientMock.loadPlayerProfile.mockResolvedValueOnce(primary).mockResolvedValueOnce(secondary);
    const view = render(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'player', entityId: 'p1' }}
        variationId="tactical-variation.primary"
      />,
    );

    expect((await screen.findAllByLabelText(/No plano atual: 78/u)).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/OVR atual: 77/u).length).toBeGreaterThan(0);
    expect(screen.getByText('80–85')).toBeInstanceOf(HTMLElement);
    const profileRegion = screen.getByRole('region', { name: 'Perfil global' });
    profileRegion.scrollTop = 320;

    view.rerender(
      <ProfileScreen
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        route={{ kind: 'player', entityId: 'p1' }}
        variationId="tactical-variation.secondary"
      />,
    );

    expect((await screen.findAllByLabelText(/No plano atual: 72/u)).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/OVR atual: 77/u).length).toBeGreaterThan(0);
    expect(screen.getByText('80–85')).toBeInstanceOf(HTMLElement);
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Perfil global' }).scrollTop).toBe(320),
    );
  });

  it('exposes a recoverable not-found state', async () => {
    clientMock.loadCoachProfile.mockRejectedValue(new Error('coach not found'));
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ProfileScreen
        onBack={onBack}
        onNavigate={vi.fn()}
        route={{ kind: 'coach', entityId: 'missing' }}
      />,
    );

    expect(await screen.findByText('Perfil não encontrado')).toBeInstanceOf(HTMLElement);
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Voltar ao contexto' }));
    await waitFor(() => expect(onBack).toHaveBeenCalledOnce());
  });
});
