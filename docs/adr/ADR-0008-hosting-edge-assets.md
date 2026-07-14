# ADR-0008 ECS Fargate, Cloudflare and R2

**Status:** Accepted · **Date:** 2026-07-13

**Context:** hosted API, public delivery and assets need clear roles. **Decision:** ECS/ALB service, Cloudflare edge, R2 objects, Neon database. **Alternatives:** serverless-only; one provider. **Consequences:** IaC and vendor boundaries. **Risks:** multi-vendor operations. **Review:** scale/cost evidence.
