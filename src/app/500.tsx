import Link from 'next/link';

import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Error500() {
    return (
        <div className="from-primary via-primary to-secondary flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
            <div className="w-full max-w-md">
                <Card className="border-white/20 bg-white/10 p-8 text-center backdrop-blur-sm">
                    <div className="mb-6 flex justify-center">
                        <CloudflareAudioLogo size={80} />
                    </div>

                    <h1 className="mb-4 text-3xl font-bold text-white">500 - Server Error</h1>

                    <p className="mb-8 text-white/80">
                        Something went wrong on our end. We&apos;re working to fix this issue.
                    </p>

                    <div className="space-y-4">
                        <Button
                            asChild
                            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full"
                        >
                            <Link href="/">Go Home</Link>
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full text-white hover:bg-white/20"
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
