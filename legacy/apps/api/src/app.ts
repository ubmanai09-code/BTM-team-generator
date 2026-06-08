import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { teamRouter } from "./modules/team/team.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { exampleDataset } from "./data/example-dataset.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp());

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.get("/v1/datasets/example", (_request, response) => {
  response.status(200).json(exampleDataset);
});

app.use("/v1/teams", teamRouter);

app.use(errorHandler);
