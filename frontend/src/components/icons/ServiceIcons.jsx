// ─────────────────────────────────────────────────
// Service SVG Icons — Unique icons for each node type
// ─────────────────────────────────────────────────
import React from 'react';

export const ServerIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="7" rx="2" />
        <rect x="2" y="14" width="20" height="7" rx="2" />
        <circle cx="6" cy="6.5" r="1" fill="currentColor" />
        <circle cx="6" cy="17.5" r="1" fill="currentColor" />
        <line x1="10" y1="6.5" x2="18" y2="6.5" />
        <line x1="10" y1="17.5" x2="18" y2="17.5" />
    </svg>
);

export const LambdaIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20L10 4" />
        <path d="M10 4L16 20" />
        <path d="M20 8L14 12L20 16" />
        <path d="M2 12H7" />
    </svg>
);

export const SqlIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
);

export const NoSqlIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
        <path d="M12 12L3 7" />
        <path d="M12 12l9-5" />
        <path d="M12 12v10" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.4" />
    </svg>
);

export const S3Icon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" rx="2" />
        <path d="M4 9h16" />
        <path d="M4 14h16" />
        <path d="M9 4v16" />
        <circle cx="6.5" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="6.5" cy="11.5" r="0.8" fill="currentColor" />
        <circle cx="6.5" cy="16.5" r="0.8" fill="currentColor" />
    </svg>
);

export const BalancerIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3" />
        <circle cx="5" cy="19" r="3" />
        <circle cx="19" cy="19" r="3" />
        <line x1="12" y1="8" x2="5" y2="16" />
        <line x1="12" y1="8" x2="19" y2="16" />
    </svg>
);

export const GatewayIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 12h4l2-3 3 6 2-3h7" />
        <circle cx="7" cy="7" r="1" fill="currentColor" />
        <circle cx="17" cy="7" r="1" fill="currentColor" />
    </svg>
);

export const CdnIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
        <path d="M4.5 7h15" />
        <path d="M4.5 17h15" />
    </svg>
);

export const CacheIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

export const QueueIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="5" height="12" rx="1" />
        <rect x="9.5" y="6" width="5" height="12" rx="1" />
        <rect x="17" y="6" width="5" height="12" rx="1" />
        <path d="M7 12h2.5" />
        <path d="M14.5 12h2.5" />
    </svg>
);

export const ClientIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

// Map subtype → icon component
export const ICON_MAP = {
    server: ServerIcon,
    lambda: LambdaIcon,
    sql: SqlIcon,
    nosql: NoSqlIcon,
    s3: S3Icon,
    balancer: BalancerIcon,
    gateway: GatewayIcon,
    cdn: CdnIcon,
    cache: CacheIcon,
    queue: QueueIcon,
    client: ClientIcon,
};
