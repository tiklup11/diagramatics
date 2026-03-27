import { type Anchor, Diagram, diagram_combine, text, linea } from '../diagram.js';
import { Vector2, V2, Vdir } from '../vector.js';
import { arc } from '../shapes.js';
import { xyaxes_decomposed } from '../daigrams_basic/shapes_graph.js';
import { compute_intersections, type LocatorStyle } from '../html_interactivity.js';
import { feedback_marker, point_highlight } from '../daigrams_basic/shapes_marker.js';
import { TAG } from '../tag_names.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PolarGridOpts {
    /** X-axis range. Default: [0, 7] */
    xrange?: [number, number];
    /** Y-axis range. Default: [0, 7] */
    yrange?: [number, number];
    /** Arc sweep angle in degrees. Default: 90 (quarter circle) */
    arcAngleDeg?: number;
    /** Max radius (number of concentric arcs). Default: 6 */
    maxRadius?: number;
    /** Angle step in degrees between radial lines. Default: 15 */
    angleStepDeg?: number;
    /** Show angle label every Nth line. Default: 2 (every other line) */
    angleLabelEvery?: number;
    /** Angle label font size. Default: 14 */
    angleLabelFontSize?: number;
    /** Grid line color (arcs + radial lines). Default: '#cecfcd' */
    gridColor?: string;
    /** Angle label text color. Default: '#6b7280' */
    labelColor?: string;
    /** Axis stroke width. Default: 1.8 */
    axisStrokeWidth?: number;
    /** Axis tick label offset. Default: 0.09 */
    tickLabelOffset?: number;
    /** Axis head size. Default: 0 */
    headsize?: number;
    /** Which axis tick labels to show. Default: ['+x', '-x'] */
    showtickLabelsfor?: ('+x' | '-x' | '+y' | '-y')[];
    /** Initial locator position. Default: V2(0, 0) */
    initialPoint?: Vector2;
    /** Target (correct answer) position. Default: V2(4, 0) */
    targetPoint?: Vector2;
    /** Locator radius. Default: 0.3 */
    locatorRadius?: number;
    /** Locator style. Default: ring variant, dark dot */
    locatorStyle?: LocatorStyle;
    /** Feedback marker size. Default: 0.42 */
    feedbackSize?: number;
    /** Show snap point highlights while dragging. Default: true */
    showSnapHighlight?: boolean;
}

export interface PolarGridHandle {
    validate: () => boolean | null;
    reset: () => void;
    setDisabled: (disabled: boolean) => void;
    setPresentationState: (state: string) => void;
}

export interface PolarGridContext {
    draw: (...diagrams: Diagram[]) => void;
    int: any;
    onAnswerableChange?: (value: boolean) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function angleLabelAnchor(theta: number): Anchor {
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    if (Math.abs(c) < 0.2) return s >= 0 ? 'bottom-center' : 'top-center';
    if (Math.abs(s) < 0.2) return c >= 0 ? 'center-left' : 'center-right';
    if (c >= 0 && s >= 0) return 'bottom-left';
    if (c < 0 && s >= 0) return 'bottom-right';
    if (c >= 0 && s < 0) return 'top-left';
    return 'top-right';
}

function samePoint(a: Vector2, b: Vector2, eps = 1e-6): boolean {
    return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Build and wire up a polar-coordinate grid with a snap-to-intersection
 * locator. The author provides `opts` to control the grid geometry and
 * the answer point; everything else (interaction, grading, feedback) is
 * handled automatically.
 */
export function polar_grid_plot(
    ctx: PolarGridContext,
    opts: PolarGridOpts = {},
): PolarGridHandle {
    const {
        xrange = [0, 7],
        yrange = [0, 7],
        arcAngleDeg = 90,
        maxRadius = 6,
        angleStepDeg = 15,
        angleLabelEvery = 2,
        angleLabelFontSize = 14,
        gridColor = '#cecfcd',
        labelColor = '#6b7280',
        axisStrokeWidth = 1.8,
        tickLabelOffset = 0.09,
        headsize = 0,
        showtickLabelsfor = ['+x', '-x'],
        initialPoint = V2(0, 0),
        targetPoint = V2(4, 0),
        locatorStyle = { color: '#111827', stroke: 'white', stroke_width: 0.1, variant: 'ring' as const },
        showSnapHighlight = true,
    } = opts;

    const gridSpan = Math.max(xrange[1] - xrange[0], yrange[1] - yrange[0]);
    const locatorRadius = opts.locatorRadius ?? gridSpan * 0.043;
    const feedbackSize = opts.feedbackSize ?? gridSpan * 0.04;

    const { draw, int, onAnswerableChange } = ctx;

    // ── Axes ──
    const axes = xyaxes_decomposed({
        xrange,
        yrange,
        tick_label_offset: tickLabelOffset,
        headsize,
        showtickLabelsfor,
    });

    // ── Arcs ──
    const arcAngle = (Math.PI / 180) * arcAngleDeg;
    const arcs: Diagram[] = [];
    for (let r = 1; r <= maxRadius; r++) {
        arcs.push(arc(r, arcAngle).stroke(gridColor));
    }

    // ── Radial lines + labels ──
    const rayLength = Math.max(xrange[1], yrange[1]);
    const lineCount = Math.floor(arcAngleDeg / angleStepDeg) + 1;
    const angleLines: Diagram[] = [];
    const angleLabels: Diagram[] = [];

    for (let i = 0; i < lineCount; i++) {
        const deg = i * angleStepDeg;
        const theta = (Math.PI / 180) * deg;

        const ray = linea(rayLength, theta, V2(0, 0)).stroke(gridColor);
        angleLines.push(ray);

        if (i % angleLabelEvery === 0) {
            const tip = ray.parametric_point(1);
            angleLabels.push(
                text(`${deg}°`)
                    .fontsize(angleLabelFontSize)
                    .textfill(labelColor)
                    .move_origin_text(angleLabelAnchor(theta))
                    .position(tip.add(Vdir(theta).scale(0.14))),
            );
        }
    }

    // ── Base diagram + snap points ──
    const baseDiagram = diagram_combine(
        ...arcs,
        ...angleLines,
        ...angleLabels,
        axes.d.strokewidth(axisStrokeWidth),
    );
    const snapPoints = compute_intersections(...arcs, ...angleLines);
    const sp = point_highlight(snapPoints);

    // ── State ──
    let hasInteracted = false;
    let externallyDisabled = false;
    let presentationState = 'interactive';
    let answeredPoint = initialPoint;

    function setAnswerable(value: boolean) {
        if (typeof onAnswerableChange === 'function') onAnswerableChange(value);
    }

    function syncLocator() {
        const locatorVisible = presentationState === 'interactive';
        const locatorDisabled = externallyDisabled || !locatorVisible;
        int.set_locator_visible('A', locatorVisible);
        int.set_locator_disabled('A', locatorDisabled);
    }

    function syncAnswerable() {
        setAnswerable(presentationState === 'interactive' && hasInteracted);
    }

    function buildOverlays(): Diagram[] {
        if (presentationState === 'answered-correct') {
            return [feedback_marker('check', targetPoint, feedbackSize)];
        }
        if (presentationState === 'answered-incorrect') {
            return [
                feedback_marker('x', answeredPoint, feedbackSize),
                feedback_marker('check', targetPoint, feedbackSize),
            ];
        }
        return [];
    }

    // ── Interactive wiring ──
    int.draw_function = () => {
        const overlays = buildOverlays();
        if (showSnapHighlight && int.locator_state('A') === 'dragging') {
            overlays.push(sp);
        }
        draw(baseDiagram, ...overlays);
    };

    int.locator(
        'A',
        initialPoint,
        locatorRadius,
        'black',
        null,
        [TAG.GRAPH_TICK, TAG.GRAPH_TICK_LABEL, TAG.ARROW_HEAD],
        true,
        (_name: string, pos: { x: number; y: number }) => {
            answeredPoint = V2(pos.x, pos.y);
            if (!hasInteracted) {
                hasInteracted = true;
                syncAnswerable();
            }
        },
        locatorStyle,
        { points: snapPoints },
        baseDiagram.bounding_box(),
    );

    int.on_locator_enter('A', 'haptic', sp, 0.2);

    syncLocator();
    syncAnswerable();
    int.draw();
    int.locator_initial_draw();

    // ── Handle ──
    return {
        validate() {
            if (!hasInteracted) return null;
            answeredPoint = int.get('A');
            return samePoint(answeredPoint, targetPoint);
        },

        reset() {
            hasInteracted = false;
            externallyDisabled = false;
            presentationState = 'interactive';
            answeredPoint = initialPoint;
            int.set('A', initialPoint);
            syncLocator();
            syncAnswerable();
            int.draw();
            int.locator_initial_draw();
        },

        setDisabled(disabled: boolean) {
            externallyDisabled = disabled;
            syncLocator();
            int.draw();
        },

        setPresentationState(state: string) {
            presentationState = state;
            syncLocator();
            syncAnswerable();
            int.draw();
        },
    };
}
