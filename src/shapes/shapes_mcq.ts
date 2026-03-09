/// <reference path="../svg.d.ts" />
import { polygon, diagram_combine, foreign_object, Diagram } from '../diagram.js';
import { V2 } from '../vector.js';
import { Interactive } from '../html_interactivity.js';
import * as mod from '../modifier.js';
import { draw_to_svg_element } from '../draw_svg.js';
import checkBoldSvg from '@phosphor-icons/core/assets/bold/check-bold.svg';
import xBoldSvg from '@phosphor-icons/core/assets/bold/x-bold.svg';

export interface McqChoice {
    id: string;
    content: Diagram;
    correct: boolean;
}

export interface McqHandle {
    validate:    () => boolean | null;
    reset:       () => void;
    setDisabled: (disabled: boolean) => void;
}

export type McqSlideState = 'idle' | 'correct' | 'incorrect';

export interface McqSetupOpts {
    onFirstInteraction?: () => void;
    /** Called during each draw to produce extra overlay diagrams (e.g. badge icons on web). */
    buildOverlay?: (choices: McqChoice[], selectedId: string | null, slideState: McqSlideState) => Diagram[];
}

interface InteractiveLike {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    button_click: (name: string, d: Diagram, dp: Diagram, cb: () => void) => void;
    draw_function: any;
    draw: () => void;
}

const CARD_W  = 62;
const CARD_H  = 36;
const GAP_X   = 6;
const GAP_Y   = 6;
const HALF_CW = CARD_W / 2;
const HALF_CH = CARD_H / 2;
export const MCQ_FONT = 'CoFo Sans, sans-serif';

const COL_X = [-(HALF_CW + GAP_X / 2), +(HALF_CW + GAP_X / 2)];
const ROW_Y = [+(HALF_CH + GAP_Y / 2), -(HALF_CH + GAP_Y / 2)];

function cardPts(cx: number, cy: number) {
    return [
        V2(cx - HALF_CW, cy - HALF_CH),
        V2(cx + HALF_CW, cy - HALF_CH),
        V2(cx + HALF_CW, cy + HALF_CH),
        V2(cx - HALF_CW, cy + HALF_CH),
    ];
}

function getPos(i: number): { cx: number; cy: number } {
    return { cx: COL_X[i % 2], cy: ROW_Y[Math.floor(i / 2)] };
}

function phosphorIcon(name: 'check' | 'x', size: number): Diagram {
    const raw = name === 'check' ? checkBoldSvg : xBoldSvg;
    const svg = raw
        .replace(/fill="currentColor"/g, 'fill="#ffffff"')
        .replace('<path ', '<path fill="#ffffff" ')
        .replace('<svg ', '<svg style="width:100%;height:100%;display:block" ');
    return foreign_object(svg, size, size, 1);
}

function buildBadgeOverlay(choices: McqChoice[], selectedId: string | null, slideState: McqSlideState): Diagram[] {
    if (slideState === 'idle') return [];
    const overlays: Diagram[] = [];
    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        const pos = getPos(i);
        const isSelected = selectedId === choice.id;
        let variant: 'correct' | 'wrong' | null = null;
        if (choice.correct)       variant = 'correct';
        else if (isSelected)      variant = 'wrong';
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
    int: InteractiveLike,
    draw: (d: Diagram) => void,
    choices: McqChoice[],
    opts: McqSetupOpts = {},
): McqHandle {
    let selectedId: string | null = null;
    let slideState: McqSlideState = 'idle';
    let disabled = false;
    let hasInteracted = false;

    int.draw_function = (_inp: Record<string, unknown>) => {
        const diagrams: Diagram[] = [];

        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            const pos = getPos(i);
            const isSelected = selectedId === choice.id;

            let variant: 'idle' | 'selected' | 'correct' | 'wrong';
            if (slideState === 'idle') {
                variant = isSelected ? 'selected' : 'idle';
            } else {
                if (choice.correct)  variant = 'correct';
                else if (isSelected) variant = 'wrong';
                else                 variant = 'idle';
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

            const bg = polygon(cardPts(pos.cx, pos.cy))
                .apply(mod.round_corner(10))
                .fill(fill).stroke(stroke).strokewidth(2);
            const lbl = choice.content
                .position(V2(pos.cx, pos.cy))
                .textfill(tColor);
            diagrams.push(bg, lbl);
        }

        if (opts.buildOverlay) {
            diagrams.push(...opts.buildOverlay(choices, selectedId, slideState));
        }

        draw(diagrams.length === 1 ? diagrams[0] : diagram_combine(...diagrams));
    };

    for (let i = 0; i < choices.length; i++) {
        const idx = i;
        const pos = getPos(idx);
        const hit = polygon(cardPts(pos.cx, pos.cy))
            .apply(mod.round_corner(10))
            .fill('transparent')
            .stroke('none');
        int.button_click('c' + idx, hit, hit, () => {
            if (disabled) return;
            selectedId = choices[idx].id;
            if (!hasInteracted && opts.onFirstInteraction) {
                hasInteracted = true;
                opts.onFirstInteraction();
            }
            int.draw();
        });
    }

    int.draw();

    return {
        validate: () => {
            if (selectedId === null) return null;
            const isCorrect = choices.find(c => c.id === selectedId)?.correct ?? false;
            slideState = isCorrect ? 'correct' : 'incorrect';
            disabled = true;
            int.draw();
            return isCorrect;
        },
        reset: () => {
            selectedId = null;
            slideState = 'idle';
            disabled = false;
            hasInteracted = false;
            int.draw();
        },
        setDisabled: (d: boolean) => { disabled = d; },
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
    return mcq_setup(int, draw, choices, { buildOverlay: buildBadgeOverlay });
}
