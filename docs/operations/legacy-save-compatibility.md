# Legacy save compatibility

Career slots produced by the `migration:legacy-local:v1` operation may predate the
`baseSnapshot.resolved.coverage.people` counter. During a verified read of that specific legacy
payload, the desktop treats the absent counter as `0`, meaning “the historical count was not
recorded.” It does not mean that the world is complete or gameplay-ready.

Compatibility is applied in memory only after the checksum of the original raw slot has passed.
The saved world, people, profiles, readiness values, and original bytes are preserved. The reader
does not rewrite the save. A present `people` value remains authoritative, while an invalid value,
missing unrelated required field, incompatible structure, truncated JSON, or missing field on a
nonlegacy slot remains an explicit corruption error.
