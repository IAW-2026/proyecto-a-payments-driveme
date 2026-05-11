import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-pg", "@prisma/client", "pg"],
};

export default nextConfig;
