import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  // TypeScript errors now fail the build (was ignoreBuildErrors: true).
  // ESLint is no longer integrated into Next.js builds (Next 16 removed it);
  // lint still runs via `npm run lint`.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
