# Deferred Items

Resolved by Plan 04-06 commit `ec31169`: Vitest test files now execute serially, so tests that intentionally exercise tracked artifact writers cannot overlap drift readers. The complete aggregate passed all 44 tests with both contract drift checks green.

Resolved by Plan 04-04 commit `192b0de`: the workspace assertion now accepts both declared workspace globs regardless of order, and Cargo metadata checks use a 64 MiB output buffer.
