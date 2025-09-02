import Link from 'next/link';
import CloudflareAudioLogo from '@/components/CloudflareAudioLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Error500() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20 text-center">
                    <div className="flex justify-center mb-6">
                        <CloudflareAudioLogo size={80} />
                    </div>
                    
                    <h1 className="text-3xl font-bold text-white mb-4">
                        500 - Server Error
                    </h1>
                    
                    <p className="text-white/80 mb-8">
                        Something went wrong on our end. We&apos;re working to fix this issue.
                    </p>
                    
                    <div className="space-y-4">
                        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Link href="/">
                                Go Home
                            </Link>
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