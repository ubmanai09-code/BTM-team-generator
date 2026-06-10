# BTM Team Generator

Production-ready, modular team generation platform with fairness analytics.

## Tech Stack

- Frontend: Next.js (React + TypeScript)
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Shared Domain: TypeScript packages for contracts and algorithms

## Implemented Requirements

1. Database schema: [prisma/schema.prisma](prisma/schema.prisma)
2. Team generation service: [apps/api/src/modules/team/team.service.ts](apps/api/src/modules/team/team.service.ts)
3. Balancing algorithm: [packages/team-core/src/generator.ts](packages/team-core/src/generator.ts)
4. API endpoints: [apps/api/src/modules/team/team.routes.ts](apps/api/src/modules/team/team.routes.ts)
5. Admin UI structure: [apps/web/app/admin/page.tsx](apps/web/app/admin/page.tsx)
6. Types/interfaces: [packages/shared/src/types.ts](packages/shared/src/types.ts)
7. Edge case handling: [docs/edge-cases.md](docs/edge-cases.md)
8. Example test dataset: [apps/api/src/data/example-dataset.ts](apps/api/src/data/example-dataset.ts)
9. Unit tests: [packages/team-core/src/__tests__/generator.test.ts](packages/team-core/src/__tests__/generator.test.ts)
10. Scalable architecture: [docs/folder-structure.md](docs/folder-structure.md)

Additional requirements supported:

- Simulation mode: [packages/team-core/src/simulation.ts](packages/team-core/src/simulation.ts)
- Manual override mode: [packages/team-core/src/manualOverride.ts](packages/team-core/src/manualOverride.ts)
- Fairness score calculation: [packages/team-core/src/fairness.ts](packages/team-core/src/fairness.ts)
- Team balance analytics dashboard: [apps/web/components/DashboardPanel.tsx](apps/web/components/DashboardPanel.tsx)

## Folder Structure

See [docs/folder-structure.md](docs/folder-structure.md).

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure backend environment:

```bash
cp apps/api/.env.example apps/api/.env
```

3. Generate Prisma client and run migrations:

```bash
npm run -w apps/api prisma:generate
npm run -w apps/api prisma:migrate
```

4. Start backend:

```bash
npm run -w apps/api dev
```

5. Start frontend:

```bash
npm run -w apps/web dev
```

## API Surface

- POST /v1/teams/generate
- POST /v1/teams/simulate
- POST /v1/teams/manual-override
- GET /v1/teams/analytics/dashboard
- GET /v1/datasets/example

Examples: [docs/api-examples.md](docs/api-examples.md)

## Fairness Metrics

- Team average deviation
- Standard deviation
- Highest vs lowest team difference
- Gender distribution validation

Implemented in [packages/team-core/src/fairness.ts](packages/team-core/src/fairness.ts).

## Pseudocode and Design Notes

- Algorithm pseudocode: [docs/pseudocode.md](docs/pseudocode.md)
- Optimization recommendations: [docs/optimization-recommendations.md](docs/optimization-recommendations.md)
