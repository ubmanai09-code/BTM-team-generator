# Folder Structure

```text
BTM-team-generator/
  apps/
    api/                # Express API, validation, persistence adapters
    web/                # Next.js admin dashboard and console
  packages/
    shared/             # Types, interfaces, validation schemas
    team-core/          # Domain logic: balancing, fairness, simulation, overrides
  prisma/
    schema.prisma       # PostgreSQL data model
    migrations/         # SQL migrations
  docs/
    pseudocode.md
    api-examples.md
    optimization-recommendations.md
```

Architecture style: modular monorepo with separation between domain, transport, and presentation layers.
