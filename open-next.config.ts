import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

// This site has no runtime revalidation; its prerendered pages are versioned
// with the deployment and can be read from the same Worker assets.
export default defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache })
