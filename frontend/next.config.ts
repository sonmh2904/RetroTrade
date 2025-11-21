import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose PUBLIC_API_URL to the browser so client code can read it
    PUBLIC_API_URL: process.env.PUBLIC_API_URL,
  },
  async rewrites() {
    const base = process.env.PUBLIC_API_URL || "";
    // Normalize to avoid double /api/v1/api/v1 when PUBLIC_API_URL already has /api/v1
    const origin = base.replace(/\/api\/v1\/?$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${origin}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "35express.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
