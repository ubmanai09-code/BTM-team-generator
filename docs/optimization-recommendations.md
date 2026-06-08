# Optimization Recommendations

1. Add run-result caching for identical payload hashes to skip recomputation during repeated simulations.
2. Parallelize simulation with worker threads when iterations exceed a threshold (for example, 500).
3. Persist precomputed participant vectors (skill, role entropy, experience normalization) to reduce repeated per-run scoring overhead.
4. Add DB indexes on TeamGenerationRun.createdAt and TeamGenerationRun.fairnessScore for dashboard filtering.
5. Introduce percentile-based fairness normalization per cohort size to avoid skew for small pools.
6. Add feature flags for strict vs relaxed gender balancing and expose confidence intervals in analytics.
7. Stream incremental simulation progress from backend to UI via SSE for long-running simulations.
8. Add property-based tests for assignment invariants and fairness monotonicity under random cohorts.
