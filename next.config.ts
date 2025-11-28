/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    devServer: {
      // Add the exact origin shown in your warning:
      allowedDevOrigins: [
        "https://3000-firebase-studio-1763653743810.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev"
      ],
    },
  },
};

module.exports = nextConfig;
