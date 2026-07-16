<!-- generated-by: gsd-doc-writer -->

# Sidebar and Main Menu Contract

## Career shell identity

During an active career the UI consistently exposes club crest/logo, club name/abbreviation, coach, primary competition, current position/context, active database, slot and save state.

### AppShell top

Compact crest + club name + competition, current Gregorian date/context and primary Continue/Advance action. The action shows blockers/next event and never advances through a required unresolved decision silently.

### Sidebar or compact career menu

Primary order: Início, Caixa de entrada, Elenco, Táticas, Dinâmica, **Treinamento**, Central de dados, Observação, Transferências, Clube, Comissão técnica, Finanças, Calendário, Competições, Relatórios. Treinamento stays adjacent to Elenco/Táticas/Dinâmica. Personalizar and career utilities are separated from daily navigation.

The compact identity area contains crest, club, coach and local-career indicator. A contextual menu exposes active database/version/mod compatibility, slot, Save Career and Return to Main Menu without polluting the sidebar.

## Save-state presentation

States: Saved with time, Unsaved changes, Saving, Save failed and Read-only/recovery when applicable. Icons never carry meaning alone; accessible text/status is available. Closing/navigation operations consult this state machine.

## Return to Main Menu contract

- clean: return and preserve slot/context;
- dirty: Save and Exit, Cancel, safe Exit Without Saving with explicit consequence;
- saving: wait/cancel return; no process termination;
- failed: reason/retry/diagnostics and explicit unsafe-exit confirmation.

## Active database contract

Show base name/version, active mods/versions/load order summary and compatibility. No database switch is available inside the save. The only alternatives are New Career or explicit Migration with backup, validation, impact/conflict report and confirmation.

## Main menu

- **Continue:** last valid save with club/coach/date/season summary.
- **New Career:** database → mods/compatibility → season → club → existing/create coach → automation → difficulty/preferences → slot/seed → generate world → start.
- **Load Career:** multiple slots/autosaves/backups with date, club, coach, season, base, mods, versions and integrity; load, duplicate, delete and restore backup.
- **Data Editor:** shared editor ecosystem, not Personalise.
- **Mods:** installed/available-local packages, dependencies/conflicts/load order/validation.
- **Settings:** global appearance/input/accessibility/application preferences.
- **Credits:** optional, only if real content exists.
- **Exit:** respects active save/write lifecycle and platform-safe shutdown.

## Accessibility and responsive behaviour

Landmarks and selected route are semantic; collapsed icons have accessible names/tooltips; focus returns after contextual menus/dialogs; keyboard order follows visual hierarchy; scroll regions remain reachable at target desktop viewports. A compact bottom/menu adaptation may exist only when viewport constraints require it and must retain the same route/identity capabilities.

## Acceptance

Club identity is never lost while navigating; route labels are unambiguous; Training position is correct; Save/Return/Base actions are discoverable; no sidebar item is placeholder at MVP1; database cannot change silently; all destructive/unsafe choices are explicit and tested.
