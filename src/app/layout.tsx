import type { Metadata } from 'next';

import Providers from '@/app/providers';
import { Footer } from '@/components/Footer';

import './globals.css';

// import { Geist, Geist_Mono } from "next/font/google";
// const geistSans = Geist({
//     variable: "--font-geist-sans",
//     subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//     variable: "--font-geist-mono",
//     subsets: ["latin"],
// });

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://getalecs.com'),
    title: {
        default: 'alecs',
        template: '%s | alecs',
    },
    description: 'AI tools made for you',
    openGraph: {
        title: 'alecs',
        description: 'AI tools made for you',
        type: 'website',
        images: ['/logo.png'],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@dasfacc',
        images: ['/logo.png'],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <div className="flex min-h-screen flex-col">
                        <main className="flex-grow">{children}</main>
                        <Footer />
                    </div>
                </Providers>
            </body>
        </html>
    );
}
