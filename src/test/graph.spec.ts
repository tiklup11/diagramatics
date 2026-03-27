import {
    get_tick_numbers, xyaxes_decomposed,
    xycorneraxes,
    xycorneraxes_xbreak
} from '../daigrams_basic/shapes_graph.js';
import { TAG } from '../tag_names.js';
import { expect } from 'chai';
import 'mocha';

describe('Graph', () => {
    describe('axes', () => {
        it('get_tick_numbers', () => {
            expect(get_tick_numbers(0, 0.1)).to.eql([0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1]);
            expect(get_tick_numbers(0, 1)).to.eql([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);
            expect(get_tick_numbers(0, 10)).to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            expect(get_tick_numbers(0, 100)).to.eql([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
            expect(get_tick_numbers(0, 5)).to.eql([0, 1, 2, 3, 4, 5]);
            // expect(get_tick_numbers(0, 15)).to.eql([ 0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15 ]);
            expect(get_tick_numbers(-6, 5)).to.eql([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
        });

        it('can hide tick labels on x or y independently', () => {
            const bothShown = xyaxes_decomposed({ xrange: [-3, 3], yrange: [-3, 3] });
            const positiveXLabelsOnly = xyaxes_decomposed({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showtickLabelsfor: ['+x', '+y', '-y'],
            });
            const negativeYLabelsOnly = xyaxes_decomposed({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showtickLabelsfor: ['+x', '-x', '-y'],
            });
            const noLabels = xyaxes_decomposed({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showtickLabelsfor: [],
            });

            expect(bothShown.xticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(4);
            expect(bothShown.yticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(4);
            expect(positiveXLabelsOnly.xticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(2);
            expect(positiveXLabelsOnly.yticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(4);
            expect(negativeYLabelsOnly.xticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(4);
            expect(negativeYLabelsOnly.yticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(2);
            expect(noLabels.xticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(0);
            expect(noLabels.yticks.get_tagged_elements(TAG.GRAPH_TICK_LABEL)).to.have.length(0);
        });

        it('can show ticks by axis side arrays', () => {
            const bothShown = xyaxes_decomposed({ xrange: [-3, 3], yrange: [-3, 3] });
            const positiveOnly = xyaxes_decomposed({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showticksfor: ['+x', '+y'],
            });
            const negativeOnly = xyaxes_decomposed({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showticksfor: ['-x', '-y'],
            });
            const noTicks = xyaxes_decomposed({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showticksfor: [],
            });
            const cornerPositiveOnly = xycorneraxes({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showticksfor: ['+x', '+y'],
            });
            const cornerBreakNegativeOnly = xycorneraxes_xbreak({
                xrange: [-3, 3],
                yrange: [-3, 3],
                showticksfor: ['-x', '-y'],
            });

            expect(bothShown.xticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(4);
            expect(bothShown.yticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(4);
            expect(positiveOnly.xticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(2);
            expect(positiveOnly.yticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(2);
            expect(negativeOnly.xticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(2);
            expect(negativeOnly.yticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(2);
            expect(noTicks.xticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(0);
            expect(noTicks.yticks.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(0);
            expect(noTicks.axes.get_tagged_elements(TAG.GRAPH_AXIS)).to.have.length(2);

            expect(cornerPositiveOnly.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(6);
            expect(cornerBreakNegativeOnly.get_tagged_elements(TAG.GRAPH_TICK)).to.have.length(6);
        });
    });

});
