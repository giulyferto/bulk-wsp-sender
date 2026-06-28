import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "ws",
    "bufferutil",
    "utf-8-validate",
    "@hapi/boom",
    "pino",
  ],
};

export default nextConfig;
