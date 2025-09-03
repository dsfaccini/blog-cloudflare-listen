// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    outputFileTracingRoot: __dirname,
    images: {
        loader: 'custom',
        loaderFile: './imageLoader.ts',
    },
};

export default nextConfig;

initOpenNextCloudflareForDev();
