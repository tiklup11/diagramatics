/// <reference path="../svg.d.ts" />
import { polygon, diagram_combine, foreign_object, Diagram } from '../diagram.js';
import { V2 } from '../vector.js';
import { Interactive } from '../html_interactivity.js';
import * as mod from '../modifier.js';
import { draw_to_svg_element } from '../draw_svg.js';
import { distribute_vertical_and_align } from '../alignment.js';
import checkBoldSvg from '@phosphor-icons/core/assets/bold/check-bold.svg';
import xBoldSvg from '@phosphor-icons/core/assets/bold/x-bold.svg';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface McqChoice {
    id: string;
    content: Diagram;
    correct: boolean;
}

export type McqSlideState = 'idle' | 'correct' | 'incorrect';

export interface McqContext {
    draw: (...diagrams: Diagram[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    int: any;
    onAnswerableChange?: (value: boolean) => void;
}

export interface CardGeometry {
    CARD_W: number;
    CARD_H: number;
    HALF_CW: number;
    HALF_CH: number;
    getPos: (i: number) => { cx: number; cy: number };
}

export interface McqOpts {
    choices: McqChoice[];
    /** Called during each draw to produce extra overlay diagrams (e.g. badge icons on web). */
    buildOverlay?: (choices: McqChoice[], selectedId: string | null, slideState: McqSlideState, geo: CardGeometry) => Diagram[];
    /** Horizontal padding added to max content width to get card width. Default: 8 */
    cardPaddingX?: number;
    /** Vertical padding added to max content height to get card height. Default: 6 */
    cardPaddingY?: number;
    /** Gap between cards horizontally. Default: 6 */
    gapX?: number;
    /** Gap between cards vertically. Default: 6 */
    gapY?: number;
    /** Number of columns in the card grid. Default: 2 */
    columnCount?: number;
    /**
     * Total pixel width the card grid should span.
     * When set, card width = (totalWidth - (cols-1)*gapX) / cols.
     * When omitted and questionDiagram is set, card width matches the question diagram width.
     * Otherwise derived from the largest content bounding box + cardPaddingX.
     */
    totalWidth?: number;
    /**
     * When provided, mcq_setup owns the full canvas: the card grid is placed below this
     * diagram using distribute_vertical_and_align. No wrappedDraw needed.
     */
    questionDiagram?: Diagram;
    /** Gap between the question diagram bottom and the card grid top. Default: 4 */
    questionGap?: number;
    /** Corner radius of each card. Default: 4 */
    borderRadius?: number;
}

export interface McqHandle {
    validate: () => boolean | null;
    reset: () => void;
    setDisabled: (disabled: boolean) => void;
    setPresentationState: (state: string) => void;
}

interface InteractiveLike {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    button_click: (name: string, d: Diagram, dp: Diagram, cb: () => void) => void;
    draw_function: any;
    draw: () => void;
}

function makeCardHelpers(choices: McqChoice[], opts: McqOpts) {
    const {
        cardPaddingX = 8,
        cardPaddingY = 6,
        gapX = 6,
        gapY = 6,
        columnCount = 2,
        totalWidth,
        questionDiagram,
        questionGap = 4,
        borderRadius = 6,
    } = opts;

    // Compute max content bounding box
    let maxW = 0, maxH = 0;
    for (const choice of choices) {
        const [min, max] = choice.content.bounding_box();
        const w = max.x - min.x;
        const h = max.y - min.y;
        if (w > maxW) maxW = w;
        if (h > maxH) maxH = h;
    }

    // Card width: explicit totalWidth > question-derived width > content-derived width
    let CARD_W: number;
    if (totalWidth !== undefined) {
        CARD_W = (totalWidth - (columnCount - 1) * gapX) / columnCount;
    } else if (questionDiagram) {
        const [qMin, qMax] = questionDiagram.bounding_box();
        const qBasedW = (qMax.x - qMin.x - (columnCount - 1) * gapX) / columnCount;
        CARD_W = Math.max(maxW + cardPaddingX, qBasedW);
    } else {
        CARD_W = maxW + cardPaddingX;
    }
    const CARD_H = maxH + cardPaddingY;
    let HALF_CW = CARD_W / 2;
    const HALF_CH = CARD_H / 2;

    // Grid offset: when questionDiagram provided, getPos returns positions already
    // offset so that distribute_vertical_and_align([questionDiagram, localCardsGrid])
    // places cards at exactly these coordinates.
    let gridOffsetX = 0;
    let gridOffsetY = 0;
    if (questionDiagram) {
        const [qMin, qMax] = questionDiagram.bounding_box();
        const totalRows = Math.ceil(choices.length / columnCount);
        const gridH = totalRows * CARD_H + (totalRows - 1) * gapY;
        gridOffsetX = (qMin.x + qMax.x) / 2;
        gridOffsetY = (qMin.y - questionGap) - gridH / 2;
    }

    function cardPts(cx: number, cy: number) {
        return [
            V2(cx - HALF_CW, cy - HALF_CH),
            V2(cx + HALF_CW, cy - HALF_CH),
            V2(cx + HALF_CW, cy + HALF_CH),
            V2(cx - HALF_CW, cy + HALF_CH),
        ];
    }

    // Returns card center in final (offset) coordinate space — used for hit areas and overlays
    function getPos(i: number): { cx: number; cy: number } {
        const col = i % columnCount;
        const row = Math.floor(i / columnCount);
        const totalRows = Math.ceil(choices.length / columnCount);
        const gridW = columnCount * CARD_W + (columnCount - 1) * gapX;
        const gridH = totalRows * CARD_H + (totalRows - 1) * gapY;
        return {
            cx: gridOffsetX + (-gridW / 2 + HALF_CW + col * (CARD_W + gapX)),
            cy: gridOffsetY + (gridH / 2 - HALF_CH - row * (CARD_H + gapY)),
        };
    }

    return {
        CARD_W, CARD_H, HALF_CW, HALF_CH, cardPts, getPos,
        questionDiagram, questionGap, gridOffsetX, gridOffsetY, borderRadius
    };
}

function phosphorIcon(name: 'check' | 'x', size: number): Diagram {
    const raw = name === 'check' ? checkBoldSvg : xBoldSvg;
    const svg = raw
        .replace(/fill="currentColor"/g, 'fill="#ffffff"')
        .replace('<path ', '<path fill="#ffffff" ')
        .replace('<svg ', '<svg style="width:100%;height:100%;display:block" ');
    return foreign_object(svg, size, size, 1);
}

function buildBadgeOverlay(choices: McqChoice[], selectedId: string | null, slideState: McqSlideState, geo: CardGeometry): Diagram[] {
    if (slideState === 'idle') return [];
    const { getPos, HALF_CW, HALF_CH } = geo;
    const overlays: Diagram[] = [];
    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        const pos = getPos(i);
        const isSelected = selectedId === choice.id;
        let variant: 'correct' | 'wrong' | null = null;
        if (choice.correct) variant = 'correct';
        else if (isSelected) variant = 'wrong';
        if (!variant) continue;

        // top-right of card bounding box
        const trx = pos.cx + HALF_CW;
        const try_ = pos.cy + HALF_CH;
        const bh = 2.5;
        const badge = polygon([
            V2(trx - bh, try_ - bh),
            V2(trx + bh, try_ - bh),
            V2(trx + bh, try_ + bh),
            V2(trx - bh, try_ + bh),
        ]).apply(mod.round_corner(0.9))
            .fill(variant === 'correct' ? '#7A7A7A' : '#E05252')
            .stroke('none');
        const iconSize = bh * 1.2;
        const badgeIcon = phosphorIcon(variant === 'correct' ? 'check' : 'x', iconSize)
            .position(V2(trx, try_));
        overlays.push(badge, badgeIcon);
    }
    return overlays;
}

/**
 * Platform-independent MCQ setup. Works with any Interactive-like object
 * (web `Interactive` or native `RNInteractive`).
 */
export function mcq_setup(
    ctx: McqContext,
    opts: McqOpts,
): McqHandle {
    const { draw, int, onAnswerableChange } = ctx;
    const { choices, buildOverlay } = opts;
    const geo = makeCardHelpers(choices, opts);
    const { cardPts, getPos,
        questionDiagram, questionGap, gridOffsetX, gridOffsetY, borderRadius } = geo;

    let selectedId: string | null = null;
    let slideState: McqSlideState = 'idle';
    let disabled = false;
    let hasInteracted = false;
    let presentationState = 'interactive';

    function setAnswerable(value: boolean) {
        if (typeof onAnswerableChange === 'function') onAnswerableChange(value);
    }

    function syncAnswerable() {
        setAnswerable(presentationState === 'interactive' && hasInteracted);
    }

    int.draw_function = (_inp: Record<string, unknown>) => {
        // Build each card at its LOCAL position (without gridOffset).
        // distribute_vertical_and_align will apply the offset when stacking with questionDiagram.
        const cardDiagrams: Diagram[] = [];

        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            const pos = getPos(i);
            const localCx = pos.cx - gridOffsetX;
            const localCy = pos.cy - gridOffsetY;
            const isSelected = selectedId === choice.id;

            let variant: 'idle' | 'selected' | 'correct' | 'wrong';
            if (slideState === 'idle') {
                variant = isSelected ? 'selected' : 'idle';
            } else {
                if (choice.correct) variant = 'correct';
                else if (isSelected) variant = 'wrong';
                else variant = 'idle';
            }

            let fill: string, stroke: string, tColor: string;
            if (variant === 'selected') {
                fill = '#EEF2FF'; stroke = '#4B6BFB'; tColor = '#4B6BFB';
            } else if (variant === 'correct') {
                fill = '#F2F2F2'; stroke = '#7A7A7A'; tColor = '#555555';
            } else if (variant === 'wrong') {
                fill = '#FFF0F0'; stroke = '#E05252'; tColor = '#E05252';
            } else {
                fill = '#FFFFFF'; stroke = '#DCDCDC'; tColor = '#555555';
            }

            const bg = polygon(cardPts(localCx, localCy))
                .apply(mod.round_corner(borderRadius))
                .fill(fill).stroke(stroke).strokewidth(2);
            const lbl = choice.content
                .position(V2(localCx, localCy))
                .textfill(tColor);
            cardDiagrams.push(diagram_combine(bg, lbl));
        }

        const localCardsGrid = cardDiagrams.length === 1
            ? cardDiagrams[0]
            : diagram_combine(...cardDiagrams);

        // Stack question + cards using distribute_vertical_and_align, which centers
        // the card grid on the question and places it questionGap below.
        // When no questionDiagram, cards stay at local origin (backward compatible).
        const cardsSection = questionDiagram
            ? distribute_vertical_and_align([questionDiagram, localCardsGrid], questionGap)
            : localCardsGrid;

        if (buildOverlay) {
            // Overlays use getPos() which returns offset-space positions — correct for
            // the final rendered layout regardless of whether questionDiagram is used.
            const overlays = buildOverlay(choices, selectedId, slideState, geo);
            draw(diagram_combine(cardsSection, ...overlays));
        } else {
            draw(cardsSection);
        }
    };

    for (let i = 0; i < choices.length; i++) {
        const idx = i;
        const pos = getPos(idx);
        const hit = polygon(cardPts(pos.cx, pos.cy))
            .apply(mod.round_corner(borderRadius))
            .fill('transparent')
            .stroke('none');
        int.button_click('c' + idx, hit, hit, () => {
            if (disabled) return;
            selectedId = choices[idx].id;
            if (!hasInteracted) {
                hasInteracted = true;
                syncAnswerable();
            }
            int.draw();
        });
    }

    syncAnswerable();
    int.draw();

    return {
        validate() {
            if (selectedId === null) return null;
            return choices.find(c => c.id === selectedId)?.correct ?? false;
        },

        reset() {
            selectedId = null;
            slideState = 'idle';
            disabled = false;
            hasInteracted = false;
            presentationState = 'interactive';
            syncAnswerable();
            int.draw();
        },

        setDisabled(d: boolean) {
            disabled = d;
            int.draw();
        },

        setPresentationState(state: string) {
            presentationState = state;
            if (state === 'answered-correct') {
                slideState = 'correct';
                disabled = true;
            } else if (state === 'answered-incorrect') {
                slideState = 'incorrect';
                disabled = true;
            } else {
                slideState = 'idle';
                disabled = false;
            }
            syncAnswerable();
            int.draw();
        },
    };
}

/**
 * Web-specific MCQ widget. Wraps `mcq_setup` and adds badge icons via `foreign_object`.
 */
export function mcq_interactive(
    ctrl: HTMLElement,
    svg: SVGSVGElement,
    choices: McqChoice[],
): McqHandle {
    const int = new Interactive(ctrl, svg);
    const draw = (d: Diagram) => draw_to_svg_element(svg, d);
    return mcq_setup({ int, draw }, { choices, buildOverlay: buildBadgeOverlay });
}
