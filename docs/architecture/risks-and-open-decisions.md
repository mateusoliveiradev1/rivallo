# Risks and Open Decisions

## Principal risks

| Risk | Mitigation | Gate |
|---|---|---|
| Sync/conflict behavior is harder than UI suggests | versioned commands, explicit conflict UX, idempotency tests | 3+ |
| Desktop bridge leaks platform concerns into domain | ports and crate dependency checks | 1 |
| Dense UI loses accessibility | approved briefs, keyboard/a11y/visual tests | 2 |
| Licensing or naming exposure | fictional official world; naming research; dependency notices | 0+ |
| Auth provider mismatch for desktop/private leagues | AuthPort and PKCE evaluation before V0.2 | 0/2 |
| Premature infrastructure cost/complexity | skeleton only, no provisioning before approval | 1 |

## Open decisions

1. Final approved name and trademark/domain availability.
2. Auth provider selection before V0.2.
3. Exact realtime transport and background-job mechanism, after V0.1 evidence.
4. Infrastructure-as-code dialect: OpenTofu or Terraform.
5. Generic icon family and final title-font choice, after Gate 2 exploration.
6. Public mod policy, legal review, and supported declarative formats before beta.
7. Public-launch age policy and legal/privacy review.
