import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const config = {
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
        protocol: "https",
      },
      {
        hostname: "images.unsplash.com",
        protocol: "https",
      },
      {
        hostname: "avatar.vercel.sh",
        protocol: "https",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/playground", destination: "/", permanent: true },
      { source: "/playground/:path+", destination: "/:path+", permanent: true },
      {
        source: "/:locale(en|cn)/playground",
        destination: "/:locale",
        permanent: true,
      },
      {
        source: "/:locale(en|cn)/playground/:path+",
        destination: "/:locale/:path+",
        permanent: true,
      },
    ];
  },
  reactCompiler: true,
  reactStrictMode: true,
  transpilePackages: ["@lumi-ui/ui"],
};

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(config);
