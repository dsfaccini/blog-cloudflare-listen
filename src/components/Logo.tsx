import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
}

export default function Logo({ width = 54, height = 24, className }: LogoProps) {
    return (
        <Image
            src="/logo.png"
            alt="Company Logo"
            className={cn(className)}
            width={width}
            height={height}
            unoptimized
        />
    );
}
