/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	output: "standalone",
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "**" },
		],
	},
	experimental: {
		serverActions: { bodySizeLimit: "2mb" },
	},
}

export default nextConfig
