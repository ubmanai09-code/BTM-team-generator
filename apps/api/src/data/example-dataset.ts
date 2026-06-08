import type { TeamGenerationRequest } from "@btm/shared";

export const exampleDataset: TeamGenerationRequest = {
  constraints: {
    teamCount: 4,
    teamSize: 3,
    enforceFemalePerTeam: false,
    femalePerTeam: 1,
    maxAllowedScoreSpread: 10,
    randomizationFactor: 0.04,
    optimizationIterations: 80,
    strictTeamSize: true,
    minSkillScore: 20,
    maxSkillScore: 95
  },
  weights: {
    skillWeight: 0.5,
    experienceWeight: 0.25,
    roleDiversityWeight: 0.2,
    genderBalanceWeight: 0.05
  },
  seed: 42,
  participants: [
    { id: "u1", name: "Alice", gender: "female", averageScore: 88, handicap: 3, division: "A", previousTournamentsHistory: ["spring-2025", "autumn-2025"], isAvailable: true },
    { id: "u2", name: "Ben", gender: "male", averageScore: 81, handicap: 5, division: "A", previousTournamentsHistory: ["spring-2025"], isAvailable: true },
    { id: "u3", name: "Chloe", gender: "female", averageScore: 77, handicap: 4, division: "B", previousTournamentsHistory: ["summer-2025"], isAvailable: true },
    { id: "u4", name: "Derek", gender: "male", averageScore: 69, handicap: 6, division: "B", previousTournamentsHistory: ["spring-2025"], isAvailable: true },
    { id: "u5", name: "Eden", gender: "non_binary", averageScore: 91, handicap: 2, division: "A", previousTournamentsHistory: ["spring-2025", "regional-2025"], isAvailable: true },
    { id: "u6", name: "Faye", gender: "female", averageScore: 72, handicap: 6, division: "B", previousTournamentsHistory: ["winter-2025"], isAvailable: true },
    { id: "u7", name: "Gabe", gender: "male", averageScore: 64, handicap: 8, division: "C", previousTournamentsHistory: ["winter-2025"], isAvailable: true },
    { id: "u8", name: "Hana", gender: "female", averageScore: 86, handicap: 3, division: "A", previousTournamentsHistory: ["spring-2025", "summer-2025"], isAvailable: true },
    { id: "u9", name: "Ivan", gender: "male", averageScore: 58, handicap: 9, division: "C", previousTournamentsHistory: ["rookie-cup"], isAvailable: true },
    { id: "u10", name: "Jules", gender: "non_binary", averageScore: 74, handicap: 5, division: "B", previousTournamentsHistory: ["summer-2025"], isAvailable: true },
    { id: "u11", name: "Kai", gender: "prefer_not_to_say", averageScore: 62, handicap: 7, division: "C", previousTournamentsHistory: ["rookie-cup"], isAvailable: true },
    { id: "u12", name: "Lena", gender: "female", averageScore: 79, handicap: 4, division: "B", previousTournamentsHistory: ["spring-2025"], isAvailable: true }
  ]
};
