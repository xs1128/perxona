import type { NextConfig } from 'next';

// On Vercel the app is fully client-rendered, so build a static export.
// Other targets (Cloudflare Workers, OpenAI Sites) keep the server build.
const nextConfig: NextConfig = process.env.VERCEL
  ? { output: 'export' }
  : {};

export default nextConfig;
