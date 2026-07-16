<!-- generated-by: gsd-doc-writer -->

# Home Command Center

## Purpose

Início is the daily command centre. At a glance it answers: what happened, what needs attention, what is next and what decision should be taken. It summarises authoritative projections and deep-links to owning routes; it does not duplicate full workspaces or own sporting rules.

## Widget contract

| Widget                 | Required summary/action                                                                                       | Authority                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Próximo jogo           | Opponent crest/name, competition/round, date/time, home/away, stadium, positions, preparation, open pre-match | Calendar + preparation      |
| Classificação resumida | Club crest, position, points, games, goal difference, nearby clubs, distance to objective, open full table    | Competition standings       |
| Agenda                 | Next matches, training, travel, registration/window deadlines and draws                                       | Calendar                    |
| Elenco                 | Injured, suspended, tired, low morale, expiring contracts, unhappy players; open filtered Squad               | Availability/Squad/Dynamics |
| Treinamento            | Focus, load, recovery, risk, recommendation; open week                                                        | Training projection         |
| Tática                 | Active plan, familiarity/readiness, pending changes and alerts; open Tactics                                  | Tactic projection           |
| Mercado e scouting     | Offers/responses/new reports/shortlist/negotiations; open context                                             | Market/Scouting             |
| Finanças e diretoria   | Balance/payroll/budget/alerts/trust/objectives; open Finance/Club                                             | Finance/Board               |
| Caixa de entrada       | Unread/urgent/pending decisions; open prioritised item                                                        | Inbox projection            |

## Priority and disclosure

Blockers/deadlines first, then next commitment, actionable warnings, recent outcomes and ambient trends. The default card shows decision-ready facts; details reveal causality/source/update time. Recommendations state author/domain, confidence and whether automation can execute them.

## Events and actions

Receives fixture/calendar/result, availability, dynamics/training/tactic, market/scouting, finance/board and inbox-count projection changes. Emits navigation/deep-link actions and typed commands only for explicitly supported quick actions; confirmation is required for consequential commands.

## States

- New career: guided first actions instead of fake trends.
- No next match/off-season: next meaningful season event.
- Partial/stale projection: retain last known value with timestamp/retry and no false freshness.
- Widget error: isolate failure; Home remains usable and offers owning-route diagnostics.
- Global projection rebuild: progress and safe navigation, not skeletons that imply current data.

## Acceptance

Every visible number/event links to an authoritative source; standings remain a summary; no widget invents unavailable data; urgency ordering is deterministic; actions open correct context; keyboard/zoom/reduced-motion and target viewports pass; domain result updates relevant widgets exactly once.
