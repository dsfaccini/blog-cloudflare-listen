import Logo from './Logo';

export const Footer = () => {
    return (
        <footer className="border-t px-4 py-6">
            <div className="container mx-auto">
                {/* Mobile layout: stacked vertically */}
                <div className="flex flex-col items-center space-y-4 md:hidden">
                    <div className="flex flex-col items-center space-y-2">
                        <Logo />
                        <p className="text-foreground/60 text-xs">An AI-first company</p>
                    </div>
                    <span className="text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} getalecs.com. All rights reserved.
                    </span>
                </div>

                {/* Desktop layout: logo left, copyright right */}
                <div className="hidden md:flex md:items-center md:justify-between">
                    <div className="flex items-center space-x-3">
                        <Logo />
                        <p className="text-foreground/60 text-sm">An AI-first company</p>
                    </div>
                    <span className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} getalecs.com. All rights reserved.
                    </span>
                </div>
            </div>
        </footer>
    );
};
