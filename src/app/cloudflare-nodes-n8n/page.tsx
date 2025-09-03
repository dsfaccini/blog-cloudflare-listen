import Link from 'next/link';

import GithubButton from '@/components/GithubButton';
import Logo from '@/components/Logo';
import NpmButton from '@/components/NpmButton';
import { Card } from '@/components/ui/card';
import { CopyToClipboard } from '@/components/ui/copy-to-clipboard';

export const metadata = {
    title: 'Cloudflare Nodes for n8n',
    description:
        'A comprehensive collection of n8n community nodes for Cloudflare. Connect workflows to R2, D1, Workers AI, KV, and Queues.',
    openGraph: {
        type: 'video.other',
        title: 'Cloudflare Nodes for n8n',
        description: 'Watch how to import and use Cloudflare nodes in n8n workflows',
        images: ['https://cdn.getalecs.com/n8n-nodes-cloudflare/import-workflow-from-url.gif'],
        videos: [
            {
                url: 'https://cdn.getalecs.com/n8n-nodes-cloudflare/import-workflow-from-url.mp4',
                type: 'video/mp4',
                width: 1920,
                height: 1080,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@dasfacc',
        images: ['/david-glasses.png'],
    },
};

const CloudflareNodesN8n = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F38020] via-[#F38020] to-[#EA4B71]">
            {/* Header with Logo */}
            <div className="container mx-auto px-4 py-6">
                <Link href="/" className="inline-block">
                    <Logo width={78} height={36} className="transition-opacity hover:opacity-80" />
                </Link>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 pb-16 lg:px-0 lg:pr-4">
                {/* Mobile Layout */}
                <div className="lg:hidden">
                    <div className="mx-auto max-w-4xl text-center">
                        <h1 className="mb-6 text-2xl font-bold text-white">
                            Cloudflare Nodes for n8n
                        </h1>

                        {/* Get Started Section */}
                        <div className="mb-12">
                            <h2 className="mb-6 text-xl font-semibold text-white">Get Started</h2>
                            <div className="mx-auto mb-6 max-w-md rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                                <p className="mb-2 text-sm text-white/80">
                                    Install via n8n Community Nodes:
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 rounded border bg-white/20 px-4 py-2 font-mono text-sm text-white">
                                        @getalecs/n8n-nodes-cloudflare
                                    </code>
                                    <CopyToClipboard
                                        text="@getalecs/n8n-nodes-cloudflare"
                                        title="Copy package name"
                                    />
                                    <a
                                        href="https://github.com/dsfaccini/cloudflare-nodes"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 transition-colors duration-200 hover:bg-white/30"
                                        title="View on GitHub"
                                    >
                                        <GithubButton />
                                    </a>
                                    <a
                                        href="https://www.npmjs.com/package/@getalecs/n8n-nodes-cloudflare?activeTab=readme"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 transition-colors duration-200 hover:bg-white/30"
                                        title="View on npm"
                                    >
                                        <NpmButton />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Video Section */}
                        <div className="mb-12">
                            <div className="mx-auto max-w-3xl">
                                <video
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    preload="metadata"
                                    src="https://cdn.getalecs.com/n8n-nodes-cloudflare/import-workflow-from-url.mp4"
                                    className="w-full rounded-lg shadow-lg"
                                    poster="https://cdn.getalecs.com/n8n-nodes-cloudflare/import-workflow-from-url.mp4"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>

                        {/* Features Grid */}
                        <div className="mb-12 grid gap-6 md:grid-cols-2">
                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    🗄️ Cloudflare R2
                                </h3>
                                <p className="text-sm text-white/80">
                                    Object storage with S3 compatibility. Upload, download, list,
                                    and manage buckets and objects.
                                </p>
                            </Card>

                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    🗃️ Cloudflare KV
                                </h3>
                                <p className="text-sm text-white/80">
                                    Globally distributed key-value store with bulk operations and
                                    metadata support.
                                </p>
                            </Card>

                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    🗂️ Cloudflare D1
                                </h3>
                                <p className="text-sm text-white/80">
                                    Serverless SQL database built on SQLite for structured data
                                    operations.
                                </p>
                            </Card>

                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    🤖 Cloudflare AI
                                </h3>
                                <p className="text-sm text-white/80">
                                    Access AI models for text generation, image creation, and speech
                                    processing.
                                </p>
                            </Card>

                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    📬 Cloudflare Queues
                                </h3>
                                <p className="text-sm text-white/80">
                                    Message queue service for asynchronous processing with trigger
                                    support.
                                </p>
                            </Card>

                            <Card className="border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                                <h3 className="mb-2 text-lg font-semibold text-white">
                                    🚀 Easy Install
                                </h3>
                                <p className="text-sm text-white/80">
                                    Install directly from n8n&apos;s community nodes or via npm
                                    package manager.
                                </p>
                            </Card>
                        </div>

                        {/* Description */}
                        <div className="text-center">
                            <p className="mx-auto max-w-2xl text-lg text-white/90">
                                A comprehensive collection of n8n community nodes for Cloudflare
                                services. Connect your workflows to R2, D1, Workers AI, KV storage,
                                and Queues.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:block">
                    <div className="grid min-h-screen grid-cols-2 items-start gap-16">
                        {/* Left Column - Videos */}
                        <div className="flex flex-col justify-center space-y-8">
                            {/* How to Install Video */}
                            <div>
                                <h3 className="mb-4 text-xl font-semibold text-white">
                                    How to Install
                                </h3>
                                <video
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    preload="metadata"
                                    src="https://cdn.getalecs.com/n8n-nodes-cloudflare/installation.mp4"
                                    className="w-full rounded-lg shadow-lg"
                                    poster="https://cdn.getalecs.com/n8n-nodes-cloudflare/installation.mp4"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>

                            {/* Start with Template Video */}
                            <div>
                                <h3 className="mb-4 text-xl font-semibold text-white">
                                    Start with a Template
                                </h3>
                                <video
                                    controls
                                    muted
                                    playsInline
                                    preload="metadata"
                                    src="https://cdn.getalecs.com/n8n-nodes-cloudflare/import-workflow-from-url.mp4"
                                    className="w-full rounded-lg shadow-lg"
                                    poster="https://cdn.getalecs.com/n8n-nodes-cloudflare/import-workflow-from-url.mp4"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </div>

                        {/* Right Column - Content */}
                        <div className="space-y-12">
                            <div>
                                <h1 className="mb-4 text-3xl font-bold text-white">
                                    Cloudflare Nodes for n8n
                                </h1>
                                <p className="mb-8 text-lg text-white/90">
                                    A comprehensive collection of n8n community nodes for Cloudflare
                                    services. Connect your workflows to R2, D1, Workers AI, KV
                                    storage, and Queues.
                                </p>
                            </div>

                            {/* Get Started Section */}
                            <div>
                                <h2 className="mb-6 text-xl font-semibold text-white">
                                    Get Started
                                </h2>
                                <div className="mb-6 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                                    <p className="mb-2 text-sm text-white/80">
                                        Install via n8n Community Nodes:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 rounded border bg-white/20 px-4 py-2 font-mono text-sm text-white">
                                            @getalecs/n8n-nodes-cloudflare
                                        </code>
                                        <CopyToClipboard
                                            text="@getalecs/n8n-nodes-cloudflare"
                                            title="Copy package name"
                                        />
                                        <a
                                            href="https://github.com/dsfaccini/cloudflare-nodes"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 transition-colors duration-200 hover:bg-white/30"
                                            title="View on GitHub"
                                        >
                                            <GithubButton />
                                        </a>
                                        <a
                                            href="https://www.npmjs.com/package/@getalecs/n8n-nodes-cloudflare?activeTab=readme"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 transition-colors duration-200 hover:bg-white/30"
                                            title="View on npm"
                                        >
                                            <NpmButton />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div>
                                <h2 className="mb-6 text-xl font-semibold text-white">
                                    Available Services
                                </h2>
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <Card className="border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            🗄️ Cloudflare R2
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            Object storage with S3 compatibility. Upload, download,
                                            list, and manage buckets and objects.
                                        </p>
                                    </Card>

                                    <Card className="border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            🗃️ Cloudflare KV
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            Globally distributed key-value store with bulk
                                            operations and metadata support.
                                        </p>
                                    </Card>

                                    <Card className="border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            🗂️ Cloudflare D1
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            Serverless SQL database built on SQLite for structured
                                            data operations.
                                        </p>
                                    </Card>

                                    <Card className="border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            🤖 Cloudflare AI
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            Access AI models for text generation, image creation,
                                            and speech processing.
                                        </p>
                                    </Card>

                                    <Card className="border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            📬 Cloudflare Queues
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            Message queue service for asynchronous processing with
                                            trigger support.
                                        </p>
                                    </Card>

                                    <Card className="border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                        <h3 className="mb-2 text-base font-semibold text-white">
                                            🚀 Easy Install
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            Install directly from n8n&apos;s community nodes or via
                                            npm package manager.
                                        </p>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloudflareNodesN8n;
