import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  // TypeScript errors now fail the build (was ignoreBuildErrors: true).
  // ESLint is skipped during builds because the repo carries pre-existing
  // lint debt (react-hooks/set-state-in-effect etc.) unrelated to this pass;
  // it still runs via `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
