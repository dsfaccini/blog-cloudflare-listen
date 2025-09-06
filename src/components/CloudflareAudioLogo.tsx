import React from 'react';

/**
 * Cloudflare-style "listening" logo — minimal headphones + pulsing waves
 *
 * Props:
 *  - size: CSS length (default 320)
 *  - primary: main orange (#F38020 by default)
 *  - secondary: highlight orange/yellow (#FDBA2C by default)
 *  - animate: enable wave pulse (default true)
 *  - title: accessible label
 */
export default function CloudflareAudioLogo({
    size = 320,
    primary = '#F38020',
    secondary = '#FDBA2C',
    animate = true,
    title = 'Listening logo',
}: {
    size?: number | string;
    primary?: string;
    secondary?: string;
    animate?: boolean;
    title?: string;
}) {
    // unique ids to avoid collisions when multiple instances are rendered
    const uid = React.useId();
    const gradId = `cf-grad-${uid}`;
    const glowId = `cf-glow-${uid}`;

    return (
        <div style={{ width: typeof size === 'number' ? `${size}px` : size }}>
            <svg
                viewBox="0 0 640 360"
                role="img"
                aria-labelledby={`title-${uid}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                <title id={`title-${uid}`}>{title}</title>

                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={primary} />
                        <stop offset="100%" stopColor={secondary} />
                    </linearGradient>

                    {/* subtle outer glow for waves */}
                    <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <style>
                        {`
            .cf-wave {
              transform-origin: 320px 180px;
              animation: ${animate ? 'cfPulse 2.4s ease-in-out infinite' : 'none'};
            }
            .cf-wave--2 { animation-delay: .4s; opacity:.85; }
            .cf-wave--3 { animation-delay: .8s; opacity:.65; }
            .cf-pop {
              animation: ${animate ? 'cfPop 3.2s ease-in-out infinite' : 'none'};
              transform-origin: center;
            }
            @keyframes cfPulse {
              0%   { transform: scale(0.92); opacity:.55; }
              35%  { transform: scale(1.02); opacity:1; }
              100% { transform: scale(0.92); opacity:.55; }
            }
            @keyframes cfPop {
              0%   { transform: translateY(0px); }
              50%  { transform: translateY(-2px); }
              100% { transform: translateY(0px); }
            }
          `}
                    </style>
                </defs>

                {/* Minimal headphones */}
                <g className="cf-pop">
                    {/* headband */}
                    <path
                        d="M120 170c0-78 64-130 200-130s200 52 200 130"
                        fill="none"
                        stroke={`url(#${gradId})`}
                        strokeWidth="28"
                        strokeLinecap="round"
                    />
                    {/* ear cups */}
                    <rect
                        x="95"
                        y="170"
                        rx="26"
                        ry="26"
                        width="78"
                        height="110"
                        fill={`url(#${gradId})`}
                    />
                    <rect
                        x="467"
                        y="170"
                        rx="26"
                        ry="26"
                        width="78"
                        height="110"
                        fill={`url(#${gradId})`}
                    />
                </g>

                {/* Sound waves between cups */}
                <g filter={`url(#${glowId})`}>
                    {/* center wave mark */}
                    <circle cx="320" cy="225" r="6" fill={secondary} className="cf-pop" />

                    {/* three pulsing arcs */}
                    <path
                        className="cf-wave cf-wave--1"
                        d="M270 210c20-22 60-22 80 0"
                        fill="none"
                        stroke={`url(#${gradId})`}
                        strokeWidth="14"
                        strokeLinecap="round"
                    />
                    <path
                        className="cf-wave cf-wave--2"
                        d="M250 195c36-40 104-40 140 0"
                        fill="none"
                        stroke={`url(#${gradId})`}
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        className="cf-wave cf-wave--3"
                        d="M230 180c52-60 148-60 180 0"
                        fill="none"
                        stroke={`url(#${gradId})`}
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                </g>
            </svg>
        </div>
    );
}
