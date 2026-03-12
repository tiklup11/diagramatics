import { Diagram, image } from '../diagram.js';

// Extracted from the original hand-crafted SVG design.
// Circle center: (338.33, 209.33), radius: 66.61 — viewBox crops to that region.
const SPHERE_SVG =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="269 140 134 134" width="134" height="134">` +
    `<defs>` +
    `<clipPath id="sp">` +
    `<circle cx="338.33335" cy="209.33333" r="66.61081"/>` +
    `</clipPath>` +
    `</defs>` +
    // base sphere
    `<circle cx="338.33335" cy="209.33333" r="66.61081" fill="#70b5f9"/>` +
    // upper-left highlight (pill rotated 43.4°)
    `<path d="m303.21416,146.82848l7.54917,0c-0.83385,0 -1.50983,9.06172 -1.50983,20.2399c0,11.17819 0.67598,20.23991 1.50983,20.23991l-7.54917,0l0,0c-0.83385,0 -2.44374,-4.16681 -4.55361,-14.74636c-2.10986,-10.57955 3.71976,-25.73345 4.55361,-25.73345z"` +
    ` fill="#aad4ff" transform="rotate(43.368 304.483 167.068)" clip-path="url(#sp)"/>` +
    // lower-right shadow
    `<path d="m395.81554,181.80001c0,0 0.85265,27.41817 0.51161,26.63478c-0.34104,-0.78338 -15.00662,28.20155 -15.00662,28.20155c0,0 -18.75825,22.52207 -19.09929,21.73868c-0.34104,-0.78338 -26.94368,8.61715 -27.28473,7.83376c-0.34104,-0.78338 -9.59602,-1.25817 -11.93706,1.95844c-2.34105,3.21662 26.77312,8.61715 26.43208,7.83377c-0.34105,-0.78339 24.21517,-7.05038 23.87413,-7.83377c-0.34104,-0.78338 16.54135,-12.92569 16.20031,-13.70908c-0.34104,-0.78338 14.83605,-28.59322 14.49501,-29.3766l-8.18544,-43.28153z"` +
    ` fill="#005fbf" clip-path="url(#sp)"/>` +
    `</svg>`;

/**
 * Create a 3D-like glossy sphere using the hand-crafted SVG design:
 * base colour #70b5f9, upper-left highlight #aad4ff, lower-right shadow #005fbf.
 * The rendered pixel size is controlled by the caller (e.g. via draw_sized).
 * @returns a Diagram object
 */
export function glossy_circle(): Diagram {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SPHERE_SVG)}`;
    return image(dataUrl, 1, 1);
}
