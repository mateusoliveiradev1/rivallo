# Isolated desktop runtime

The normal Rivallo desktop release always uses the platform AppData directory when no override is
present. Automated local UAT may opt into a process-scoped isolated directory by setting both
`RIVALLO_APP_DATA_DIR` and
`RIVALLO_APP_DATA_ISOLATION_GUARD=authorized-isolated-runtime` in the launched process only.

The isolated path must be absolute, must name a `uat-*` directory, must not be the normal AppData
directory or a filesystem root, and must resolve to a directory. Invalid input stops startup. The
runtime does not write either value to the registry, an `.env` file, preferences, or AppData, so a
later process without the variables returns to normal AppData automatically.

Launchers and normal desktop sessions must not define either variable. UAT scripts should clear
inherited `RIVALLO_*` variables before setting the two values for the child process and should remove
them again when that process exits.
