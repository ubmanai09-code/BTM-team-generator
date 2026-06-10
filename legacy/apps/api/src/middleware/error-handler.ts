import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DomainError } from "@btm/team-core";
import { env } from "../config/env.js";

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation failed",
      issues: error.issues
    });
    return;
  }

  if (error instanceof DomainError) {
    response.status(422).json({ message: error.message });
    return;
  }

  if (error instanceof Error) {
    // Keep full stack in server logs while giving a useful message during development.
    console.error(error);
    if (env.NODE_ENV !== "production") {
      response.status(500).json({ message: error.message });
      return;
    }
  }

  response.status(500).json({ message: "Unexpected internal error" });
};
