import { invoke } from '@tauri-apps/api/core';

import type { Formation, MatchdayState, TacticalApproach } from './types.js';

export const loadMatchday = () => invoke<MatchdayState>('matchday_state');

export const saveMatchdayLineup = (
  playerIds: readonly string[],
  formation: Formation,
  approach: TacticalApproach,
) =>
  invoke<MatchdayState>('update_matchday_lineup', {
    playerIds: [...playerIds],
    formation,
    approach,
  });

export const playNextMatch = () => invoke<MatchdayState>('play_next_match');
