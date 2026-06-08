import { Router } from "express";
import { TeamController } from "./team.controller.js";
import { TeamRepository } from "./team.repository.js";
import { TeamService } from "./team.service.js";

const repository = new TeamRepository();
const service = new TeamService(repository);
const controller = new TeamController(service);

export const teamRouter = Router();

teamRouter.post("/generate", controller.generate);
teamRouter.post("/simulate", controller.simulate);
teamRouter.post("/manual-override", controller.manualOverride);
teamRouter.post("/rebalance", controller.rebalance);
teamRouter.get("/analytics/dashboard", controller.dashboard);
teamRouter.get("/export/:format/:runId", controller.exportRun);
