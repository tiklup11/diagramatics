import { Diagram, diagram_combine, polygon } from '../diagram.js';
import { V2 } from '../vector.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PatternBlockStyle {
    /** Fill color. Default: '#7C3AED' */
    color?: string;
    /** Stroke color. Default: '#5B21B6' */
    strokeColor?: string;
    /** Stroke width. Default: 0.25 */
    strokeWidth?: number;
}

export interface PatternStaircaseOpts extends PatternBlockStyle {
    /**
     * Explicit per-column block counts (left → right).
     * Defaults to the ascending staircase rule: column k → (k + 2) blocks.
     */
    columnHeights?: number[];
    /** Block size (square). Default: 2.5 */
    blockSize?: number;
    /** Step between adjacent block centers (block + gap). Default: 3.0 */
    step?: number;
    /**
     * Bottom-left anchor of the figure's bounding box.
     * Omit both to auto-center the figure at (0, 0).
     */
    anchorX?: number;
    anchorY?: number;
}

// ─── pattern_block ────────────────────────────────────────────────────────────

/**
 * Draw a single square block centered at (cx, cy).
 *
 * The building unit for all pattern figures.
 */
export function pattern_block(
    cx: number,
    cy: number,
    blockSize: number,
    style: PatternBlockStyle = {},
): Diagram {
    const {
        color = '#7C3AED',
        strokeColor = '#5B21B6',
        strokeWidth = 0.25,
    } = style;
    const h = blockSize / 2;
    return polygon([V2(cx - h, cy - h), V2(cx + h, cy - h), V2(cx + h, cy + h), V2(cx - h, cy + h)])
        .fill(color)
        .stroke(strokeColor)
        .strokewidth(strokeWidth);
}

// ─── Dimension helpers ────────────────────────────────────────────────────────

/**
 * Width of a staircase figure's bounding box (same for any column heights).
 */
export function pattern_staircase_width(n: number, blockSize: number, step: number): number {
    return (n - 1) * step + blockSize;
}

/**
 * Height of a staircase figure using the **default rule** (col k → k+2 blocks).
 * For custom column heights use `pattern_staircase_bounds`.
 */
export function pattern_staircase_height(n: number, blockSize: number, step: number): number {
    return (2 * n - 1) * step + blockSize;
}

/**
 * Bounding box for any explicit column height assignment.
 */
export function pattern_staircase_bounds(
    columnHeights: number[],
    blockSize: number,
    step: number,
): { w: number; h: number } {
    const n = columnHeights.length;
    let maxY = 0;
    for (let k = 0; k < n; k++) {
        const topEdge = k * step + (columnHeights[k] - 1) * step + blockSize;
        if (topEdge > maxY) maxY = topEdge;
    }
    return { w: (n - 1) * step + blockSize, h: maxY };
}

// ─── pattern_cells ────────────────────────────────────────────────────────────

export interface PatternCellsOpts extends PatternBlockStyle {
    /** Block size (square). Default: 2.5 */
    blockSize?: number;
    /** Step between adjacent block centers (block + gap). Default: 3.0 */
    step?: number;
    /**
     * Bottom-left anchor of the figure's bounding box.
     * Omit both to auto-center the figure at (0, 0).
     */
    anchorX?: number;
    anchorY?: number;
}

/**
 * Draw a pattern figure from an array of `[row, col]` cell positions.
 *
 * Row 0 is the bottom; positive rows go up.
 * Col 0 is the leftmost; positive cols go right.
 *
 * Omit `anchorX`/`anchorY` to auto-center at (0, 0).
 *
 * ```ts
 * // Triangle (figure 3: 3 rows, base-width 3)
 * pattern_cells([[0,0],[0,1],[0,2],[1,0],[1,1],[2,0]])
 *
 * // L-shape
 * pattern_cells([[0,0],[1,0],[2,0],[2,1],[2,2]])
 *
 * // Plus/cross
 * pattern_cells([[0,1],[1,0],[1,1],[1,2],[2,1]])
 * ```
 */
export function pattern_cells(
    cells: [number, number][],
    opts: PatternCellsOpts = {},
): Diagram {
    const {
        blockSize = 2.5,
        step = 3.0,
        color = '#7C3AED',
        strokeColor = '#5B21B6',
        strokeWidth = 0.25,
    } = opts;

    if (cells.length === 0) return polygon([V2(0, 0)]).fill('none').stroke('none');

    // Compute bounding box from cell extents
    let minRow = cells[0][0], maxRow = cells[0][0];
    let minCol = cells[0][1], maxCol = cells[0][1];
    for (const [r, c] of cells) {
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
    }
    const figW = (maxCol - minCol) * step + blockSize;
    const figH = (maxRow - minRow) * step + blockSize;

    const ax = opts.anchorX ?? -figW / 2 - minCol * step;
    const ay = opts.anchorY ?? -figH / 2 - minRow * step;

    return diagram_combine(
        ...cells.map(([row, col]) =>
            pattern_block(
                ax + col * step + blockSize / 2,
                ay + row * step + blockSize / 2,
                blockSize,
                { color, strokeColor, strokeWidth },
            ),
        ),
    );
}

/**
 * Compute the bounding box of a cell array (in diagram units).
 */
export function pattern_cells_bounds(
    cells: [number, number][],
    blockSize: number,
    step: number,
): { w: number; h: number } {
    if (cells.length === 0) return { w: 0, h: 0 };
    let minRow = cells[0][0], maxRow = cells[0][0];
    let minCol = cells[0][1], maxCol = cells[0][1];
    for (const [r, c] of cells) {
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
    }
    return {
        w: (maxCol - minCol) * step + blockSize,
        h: (maxRow - minRow) * step + blockSize,
    };
}

// ─── pattern_staircase ────────────────────────────────────────────────────────

/**
 * Build a diagonal staircase figure of `n` columns.
 *
 * **Default rule:** column k (0-indexed) has (k + 2) blocks stacked vertically,
 * each column offset one step right and one step up — the ascending staircase.
 *
 * Override with `columnHeights` to produce distractor variants:
 * ```ts
 * pattern_staircase(5)                                      // [2,3,4,5,6] – correct
 * pattern_staircase(5, { columnHeights: [4,4,4,4,4] })     // uniform
 * pattern_staircase(5, { columnHeights: [6,5,4,3,2] })     // reversed
 * ```
 *
 * Omit `anchorX`/`anchorY` to auto-center the result at (0, 0),
 * which is what you want for MCQ choice content.
 */
export function pattern_staircase(n: number, opts: PatternStaircaseOpts = {}): Diagram {
    const {
        blockSize = 2.5,
        step = 3.0,
        color = '#7C3AED',
        strokeColor = '#5B21B6',
        strokeWidth = 0.25,
    } = opts;

    const heights: number[] = opts.columnHeights
        ? opts.columnHeights
        : (() => { const h: number[] = []; for (let k = 0; k < n; k++) h.push(k + 2); return h; })();

    const { w: figW, h: figH } = pattern_staircase_bounds(heights, blockSize, step);
    const ax = opts.anchorX ?? -figW / 2;
    const ay = opts.anchorY ?? -figH / 2;

    const blocks: Diagram[] = [];
    for (let col = 0; col < n; col++) {
        const colH = heights[col];
        for (let row = 0; row < colH; row++) {
            blocks.push(
                pattern_block(
                    ax + col * step + blockSize / 2,
                    ay + col * step + row * step + blockSize / 2,
                    blockSize,
                    { color, strokeColor, strokeWidth },
                ),
            );
        }
    }

    return diagram_combine(...blocks);
}
