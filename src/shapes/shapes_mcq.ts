/// <reference path="../svg.d.ts" />
import { polygon, text, diagram_combine, foreign_object, Diagram } from '../diagram.js';
import { V2 } from '../vector.js';
import { Interactive } from '../html_interactivity.js';
import * as mod from '../modifier.js';
import { draw_to_svg_element } from '../draw_svg.js';
import checkBoldSvg from '@phosphor-icons/core/assets/bold/check-bold.svg';
import xBoldSvg from '@phosphor-icons/core/assets/bold/x-bold.svg';

export interface McqChoice {
    id: string;
    content: string;
    correct: boolean;
}

export interface McqSignal {
    slideState: 'idle' | 'correct' | 'incorrect';
    selectedId: string | null;
    isCorrect: boolean | null;
    redraw: () => void;
    reset: () => void;
}

const CARD_W  = 62;
const CARD_H  = 36;
const GAP_X   = 6;
const GAP_Y   = 6;
const HALF_CW = CARD_W / 2;
const HALF_CH = CARD_H / 2;
const MCQ_FONT = 'CoFo Sans, sans-serif';

function phosphorIcon(name: 'check' | 'x', size: number): Diagram {
    const raw = name === 'check' ? checkBoldSvg : xBoldSvg;
    const svg = raw
        .replace(/fill="currentColor"/g, 'fill="#ffffff"')
        .replace('<path ', '<path fill="#ffffff" ')
        .replace('<svg ', '<svg style="width:100%;height:100%;display:block" ');
    return foreign_object(svg, size, size, 1);
}

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

export function mcq_interactive(
    ctrl: HTMLElement,
    svg: SVGSVGElement,
    choices: McqChoice[],
    signal?: McqSignal | null,
): void {
    let selectedId: string | null = null;
    const int = new Interactive(ctrl, svg);

    int.draw_function = (_inp: Record<string, unknown>) => {
        const slideState = signal?.slideState ?? 'idle';
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
            const lbl = text(choice.content)
                .position(V2(pos.cx, pos.cy))
                .fontsize(14)
                .fontfamily(MCQ_FONT)
                .textfill(tColor)
                .stroke('none');
            diagrams.push(bg, lbl);

            if (variant === 'correct' || variant === 'wrong') {
                const tr = bg.get_anchor('top-right');
                const bh = 2.5;
                const badge = polygon([
                    V2(tr.x - bh, tr.y - bh),
                    V2(tr.x + bh, tr.y - bh),
                    V2(tr.x + bh, tr.y + bh),
                    V2(tr.x - bh, tr.y + bh),
                ]).apply(mod.round_corner(0.9))
                  .fill(variant === 'correct' ? '#7A7A7A' : '#E05252')
                  .stroke('none');
                const iconSize = bh * 1.2;
                const badgeIcon = phosphorIcon(variant === 'correct' ? 'check' : 'x', iconSize)
                    .position(V2(tr.x, tr.y));
                diagrams.push(badge, badgeIcon);
            }
        }

        const combined = diagrams.length === 1 ? diagrams[0] : diagram_combine(...diagrams);
        draw_to_svg_element(svg, combined);
    };

    if (signal) {
        signal.redraw = () => int.draw();
        signal.reset  = () => { selectedId = null; int.draw(); };
    }

    for (let i = 0; i < choices.length; i++) {
        const idx = i;
        const pos = getPos(idx);
        const hit = polygon(cardPts(pos.cx, pos.cy))
            .apply(mod.round_corner(10))
            .fill('transparent')
            .stroke('none');
        int.button_click('c' + idx, hit, hit, () => {
            selectedId = choices[idx].id;
            if (signal) {
                signal.selectedId = selectedId;
                signal.isCorrect  = choices[idx].correct;
            }
            int.draw();
        });
    }

    int.draw();
}
