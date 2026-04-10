/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['puppeteer', 'socks-proxy-agent'],
};

export default nextConfig;
