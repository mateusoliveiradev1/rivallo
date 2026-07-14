# Infrastructure Strategy

Cloudflare supplies DNS/CDN/protection/rate limiting; R2 holds validated assets, mods, datapacks, exports, and suitable auxiliary backups; ECS Fargate runs the modular-monolith API and background tasks behind an ALB; Neon is the authoritative PostgreSQL. Large uploads use server-issued presigned URLs where appropriate. IaC is skeleton-only until approved.
