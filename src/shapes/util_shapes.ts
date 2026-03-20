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
    strokeWidth?: number;
    linecap?: 'butt' | 'round' | 'square';
    linejoin?: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
}

const BADGE_VIEWBOX_SIZE = 24;
const BADGE_CORNER_RADIUS = 7.5;

const DEFAULT_STYLE = {
    check: {
        badgeColor: '#58B64F',
        dotColor: '#58B64F',
    },
    x: {
        badgeColor: '#E05252',
        dotColor: '#E05252',
    },
} as const;

function badgeSvg(
    kind: 'check' | 'x',
    badgeColor: string,
    iconColor: string,
    strokeWidth: number,
    linecap: 'butt' | 'round' | 'square',
    linejoin: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round',
): string {
    const iconPath = kind === 'check'
        ? `<path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" fill="none" stroke="${iconColor}" stroke-width="${strokeWidth}" stroke-linecap="${linecap}" stroke-linejoin="${linejoin}"/>`
        : `<path d="M7.5 7.5L16.5 16.5M16.5 7.5L7.5 16.5" fill="none" stroke="${iconColor}" stroke-width="${strokeWidth}" stroke-linecap="${linecap}" stroke-linejoin="${linejoin}"/>`;

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BADGE_VIEWBOX_SIZE} ${BADGE_VIEWBOX_SIZE}" width="${BADGE_VIEWBOX_SIZE}" height="${BADGE_VIEWBOX_SIZE}">` +
        `<rect x="0" y="0" width="${BADGE_VIEWBOX_SIZE}" height="${BADGE_VIEWBOX_SIZE}" rx="${BADGE_CORNER_RADIUS}" fill="${badgeColor}"/>` +
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
    linejoin: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round',
): Diagram {
    const svg = badgeSvg(kind, badgeColor, iconColor, strokeWidth, linecap, linejoin);
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
    const dotRadius = options.dotRadius ?? size * 0.45;
    const strokeWidth = options.strokeWidth ?? 2.8;
    const linecap = options.linecap ?? 'butt';
    const linejoin = options.linejoin ?? 'miter';
    const badgeGap = size * 0.18;
    const badgeOffsetY = options.badgeOffsetY ?? (dotRadius + badgeGap + badgeSize / 2);

    const badgeCenter = V2(0, badgeOffsetY);
    const badge = badgeImage(kind, badgeSize, badgeColor, iconColor, strokeWidth, linecap, linejoin)
        .position(badgeCenter);
    const dot = circle(dotRadius)
        .fill(dotColor)
        .stroke(dotColor)
        .strokewidth(dotRadius * 0.12);

    return diagram_combine(dot, badge).position(point);
}
