import { circle } from '../shapes.js';
import { diagram_combine, image, type Diagram } from '../diagram.js';
import { V2, type Vector2 } from '../vector.js';

export interface FeedbackMarkerOptions {
    color?: string;
    badgeColor?: string;
    dotColor?: string;
    iconColor?: string;
    badgeOffsetY?: number;
    dotRadius?: number;
    badgeSize?: number;
    cornerRadius?: number;
    strokeWidth?: number;
    linecap?: 'butt' | 'round' | 'square';
}

const DEFAULT_STYLE = {
    check: {
        badgeColor: '#58B64F',
        dotColor: '#7FD57A',
    },
    x: {
        badgeColor: '#E05252',
        dotColor: '#F07E7E',
    },
} as const;

function badgeSvg(
    kind: 'check' | 'x',
    badgeColor: string,
    iconColor: string,
    strokeWidth: number,
    linecap: 'butt' | 'round' | 'square',
): string {
    const iconPath = kind === 'check'
        ? `<path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" fill="none" stroke="${iconColor}" stroke-width="${strokeWidth}" stroke-linecap="${linecap}" stroke-linejoin="round"/>`
        : `<path d="M7.5 7.5L16.5 16.5M16.5 7.5L7.5 16.5" fill="none" stroke="${iconColor}" stroke-width="${strokeWidth}" stroke-linecap="${linecap}" stroke-linejoin="round"/>`;

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">` +
        `<rect x="0" y="0" width="24" height="24" rx="5.2" fill="${badgeColor}"/>` +
        iconPath +
        `</svg>`
    );
}

function badgeImage(
    kind: 'check' | 'x',
    size: number,
    badgeColor: string,
    iconColor: string,
    strokeWidth: number,
    linecap: 'butt' | 'round' | 'square',
): Diagram {
    const svg = badgeSvg(kind, badgeColor, iconColor, strokeWidth, linecap);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return image(dataUrl, size, size);
}

export function feedback_marker(
    kind: 'check' | 'x',
    point: Vector2,
    size: number,
    options: FeedbackMarkerOptions = {},
): Diagram {
    const badgeColor = options.badgeColor ?? options.color ?? DEFAULT_STYLE[kind].badgeColor;
    const dotColor = options.dotColor ?? DEFAULT_STYLE[kind].dotColor;
    const iconColor = options.iconColor ?? '#FFFFFF';
    const badgeSize = options.badgeSize ?? size * 1.5;
    const badgeOffsetY = options.badgeOffsetY ?? size * 1.35;
    const dotRadius = options.dotRadius ?? size * 0.45;
    const strokeWidth = options.strokeWidth ?? 2.8;
    const linecap = options.linecap ?? 'round';

    const badgeCenter = V2(0, badgeOffsetY);
    const badge = badgeImage(kind, badgeSize, badgeColor, iconColor, strokeWidth, linecap)
        .position(badgeCenter);
    const dot = circle(dotRadius)
        .fill(dotColor)
        .stroke(dotColor)
        .strokewidth(dotRadius * 0.12);

    return diagram_combine(badge, dot).position(point);
}
