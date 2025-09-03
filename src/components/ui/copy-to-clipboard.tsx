'use client';

import { Check, Copy } from 'lucide-react';

import React, { useState } from 'react';

import { cn } from '@/lib/utils';

interface CopyToClipboardProps {
    text: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost' | 'outline';
    title?: string;
}

export const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
    text,
    className,
    size = 'md',
    variant = 'default',
    title = 'Copy to clipboard',
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    const variantClasses = {
        default: 'bg-white/20 hover:bg-white/30 text-white',
        ghost: 'hover:bg-white/10 text-white',
        outline: 'border border-white/20 hover:bg-white/10 text-white',
    };

    return (
        <button
            onClick={handleCopy}
            className={cn(
                'flex items-center justify-center rounded-lg transition-all duration-200',
                sizeClasses[size],
                variantClasses[variant],
                copied && 'bg-green-500/20 text-green-400',
                className,
            )}
            title={copied ? 'Copied!' : title}
        >
            {copied ? (
                <Check className={cn(iconSizes[size], 'text-green-400')} />
            ) : (
                <Copy className={iconSizes[size]} />
            )}
        </button>
    );
};
