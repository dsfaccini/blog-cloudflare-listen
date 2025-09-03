import CloudflareAudioLogo from './CloudflareAudioLogo';

export const Footer = () => {
    return (
        <footer className="border-t px-4 py-6">
            <div className="container mx-auto">
                {/* Mobile layout: stacked vertically */}
                <div className="flex flex-col items-center space-y-4 md:hidden">
                    <div className="flex flex-col items-center space-y-2">
                        <CloudflareAudioLogo />
                    </div>
                    <p className="text-foreground/60 text-xs">
                        The Blog Cloudflare Listen is a hobby project created by @dasfacc
                    </p>
                    <span className="text-center text-sm text-gray-500">
                        {new Date().getFullYear()}
                    </span>
                </div>

                {/* Desktop layout: logo left, copyright right */}
                <div className="hidden md:flex md:items-center md:justify-between">
                    <div className="flex items-center space-x-3">
                        <CloudflareAudioLogo />
                    </div>
                    <p className="text-foreground/60 text-sm">
                        The Blog Cloudflare Listen is a hobby project created by @dasfacc
                    </p>
                    <span className="text-sm text-gray-500">{new Date().getFullYear()}</span>
                </div>
            </div>
        </footer>
    );
};
