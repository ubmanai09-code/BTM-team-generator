import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"
  };

  return nextConfig;
};
