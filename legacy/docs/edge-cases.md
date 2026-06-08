# Edge Case Handling

Covered by validation and domain checks:

- Not enough available participants for requested team count.
- Invalid skill bounds (min > max).
- Out-of-range participant skill scores.
- Weight vectors that do not sum to 1.
- Impossible strict gender constraints (fallback assignment with warnings).
- Manual override with unknown teams or participants.
- Swap override missing swapWithParticipantId.
- Team size variance above configured threshold (warning surfaced).
- Empty team fairness math (safe zero behavior).
- Simulation bounds and guardrails (1..5000 iterations).
