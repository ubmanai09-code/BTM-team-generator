# API Examples

## Generate Teams

```http
POST /v1/teams/generate
Content-Type: application/json
```

```json
{
  "participants": [
    {
      "id": "u1",
      "displayName": "Alice",
      "skillScore": 88,
      "experienceMonths": 60,
      "preferredRoles": ["frontend"],
      "gender": "female",
      "tags": ["react"],
      "isAvailable": true
    }
  ],
  "constraints": {
    "teamCount": 2,
    "maxTeamSizeVariance": 1,
    "enforceGenderBalance": true
  },
  "weights": {
    "skillWeight": 0.5,
    "experienceWeight": 0.25,
    "roleDiversityWeight": 0.2,
    "genderBalanceWeight": 0.05
  }
}
```

## Simulation Mode

```http
POST /v1/teams/simulate
Content-Type: application/json
```

```json
{
  "participants": ["..."],
  "constraints": { "teamCount": 4, "maxTeamSizeVariance": 1, "enforceGenderBalance": true },
  "weights": { "skillWeight": 0.5, "experienceWeight": 0.25, "roleDiversityWeight": 0.2, "genderBalanceWeight": 0.05 },
  "iterations": 200,
  "seed": 42
}
```

## Manual Override Mode

```http
POST /v1/teams/manual-override?enforceGenderBalance=true
Content-Type: application/json
```

```json
{
  "baseResult": { "teams": ["..."], "analytics": ["..."], "fairness": {"fairnessScore": 92}, "warnings": [] },
  "operations": [
    {
      "type": "swap",
      "fromTeamId": "team-1",
      "participantId": "u1",
      "toTeamId": "team-2",
      "swapWithParticipantId": "u9"
    }
  ]
}
```

## Dashboard Analytics

```http
GET /v1/teams/analytics/dashboard?limit=20
```
