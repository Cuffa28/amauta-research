import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (Monitor FCIs) usa require() dinámicos que webpack no puede bundlear.
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "amautainversiones.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
