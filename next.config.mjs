const isGithubPages = process.env.GITHUB_ACTIONS === "true";
const repoName = "image-to-character";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}/` : "",
};

export default nextConfig;
