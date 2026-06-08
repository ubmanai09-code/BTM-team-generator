import type { NextFunction, Request, Response } from "express";
import {
  type ManualOverrideRequest,
  type RebalanceRequest,
  type SimulationRequest,
  type TeamGenerationRequest,
  manualOverrideRequestSchema,
  rebalanceRequestSchema,
  simulationRequestSchema,
  teamGenerationRequestSchema
} from "@btm/shared";
import { TeamService } from "./team.service.js";

export class TeamController {
  constructor(private readonly service: TeamService) {}

  generate = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = teamGenerationRequestSchema.parse(request.body) as TeamGenerationRequest;
      const result = await this.service.generate(payload);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  simulate = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = simulationRequestSchema.parse(request.body) as SimulationRequest;
      const result = await this.service.simulate(payload);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  manualOverride = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = manualOverrideRequestSchema.parse(request.body) as ManualOverrideRequest;
      const enforceFemalePerTeam = request.query.enforceFemalePerTeam === "true";
      const result = await this.service.manualOverride(payload, enforceFemalePerTeam);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  rebalance = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = rebalanceRequestSchema.parse(request.body) as RebalanceRequest;
      const result = await this.service.rebalance(payload);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  dashboard = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = Number(request.query.limit ?? 20);
      const result = await this.service.dashboard(limit);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  exportRun = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const runId = String(request.params.runId);
      const format = request.params.format === "excel" ? "excel" : "pdf";
      const exported = await this.service.exportRun(runId, format);

      response.setHeader("Content-Type", exported.mime);
      response.setHeader("Content-Disposition", `attachment; filename=\"${exported.filename}\"`);
      response.status(200).send(exported.content);
    } catch (error) {
      next(error);
    }
  };
}
