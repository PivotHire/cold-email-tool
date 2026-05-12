import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.pivothire.tech",
      },
    ],
  },
};

export default nextConfig;
