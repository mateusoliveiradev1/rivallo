# ADR-0010 AuthPort

**Status:** Accepted · **Date:** 2026-07-13

**Context:** provider is undecided and desktop auth needs PKCE. **Decision:** DevIdentityProvider in V0.1 behind AuthPort; evaluate Cognito/Auth0/Clerk/WorkOS and compatible OIDC before V0.2. **Alternatives:** bespoke passwords; early lock-in. **Consequences:** delayed provider decision. **Risks:** integration changes. **Review:** before multiplayer.
