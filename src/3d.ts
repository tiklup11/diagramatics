import { Diagram, polygon, line, text, diagram_combine } from './diagram.js';
import { Vector2, V2 } from './vector.js';
import { circle, arrow1, regular_polygon } from './shapes.js';

// ── Vector3 ──────────────────────────────────────────────────────────────

export class Vector3 {
    constructor(public x: number, public y: number, public z: number) {}
    add(v: Vector3): Vector3 {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    sub(v: Vector3): Vector3 {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }
    scale(s: number): Vector3 {
        return new Vector3(this.x * s, this.y * s, this.z * s);
    }
    dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    cross(v: Vector3): Vector3 {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x,
        );
    }
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    length_sq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    normalize(): Vector3 {
        const len = this.length();
        return new Vector3(this.x / len, this.y / len, this.z / len);
    }
    copy(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
    rotateX(angle: number): Vector3 {
        const c = Math.cos(angle), s = Math.sin(angle);
        return new Vector3(this.x, this.y * c - this.z * s, this.y * s + this.z * c);
    }
    rotateY(angle: number): Vector3 {
        const c = Math.cos(angle), s = Math.sin(angle);
        return new Vector3(this.x * c + this.z * s, this.y, -this.x * s + this.z * c);
    }
    rotateZ(angle: number): Vector3 {
        const c = Math.cos(angle), s = Math.sin(angle);
        return new Vector3(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
    }
}

export function V3(x: number, y: number, z: number): Vector3 {
    return new Vector3(x, y, z);
}

// ── Face ─────────────────────────────────────────────────────────────────

export interface FaceStyle {
    fill?: string;
    stroke?: string;
    strokewidth?: number;
    opacity?: number;
}

export interface Face extends FaceStyle {
    corners: Vector3[];
}

export function face(corners: Vector3[], style?: FaceStyle): Face {
    return { corners, ...style };
}

// ── Shape3D ──────────────────────────────────────────────────────────────

export interface Shape3D {
    faces: Face[];
    position: Vector3;
}

function make_shape(faces: Face[], position?: Vector3): Shape3D {
    return { faces, position: position ?? new Vector3(0, 0, 0) };
}

// ── Projection ───────────────────────────────────────────────────────────

export interface Projection {
    project: (v: Vector3) => Vector2;
    depth: (v: Vector3) => number;
}

const ISO_COS30 = Math.sqrt(3) / 2; // 0.866

export function isometric(rotation: number = 0, scale: number = 1): Projection {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    return {
        project(v: Vector3): Vector2 {
            const rx = v.x * c - v.z * s;
            const rz = v.x * s + v.z * c;
            return V2(
                (rx - rz) * ISO_COS30 * scale,
                ((rx + rz) * 0.5 + v.y) * scale,
            );
        },
        depth(v: Vector3): number {
            const rx = v.x * c - v.z * s;
            const rz = v.x * s + v.z * c;
            return rx + rz - v.y;
        },
    };
}

export function orthographic(opts?: {
    rotationY?: number;
    rotationX?: number;
    scale?: number;
    offset?: Vector2;
}): Projection {
    const ry = opts?.rotationY ?? 0;
    const rx = opts?.rotationX ?? 0;
    const sc = opts?.scale ?? 1;
    const off = opts?.offset ?? V2(0, 0);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cx = Math.cos(rx), sx = Math.sin(rx);
    return {
        project(v: Vector3): Vector2 {
            // Y rotation
            const x1 = v.x * cy + v.z * sy;
            const z1 = -v.x * sy + v.z * cy;
            // X rotation (tilt)
            const y1 = v.y * cx - z1 * sx;
            const z2 = v.y * sx + z1 * cx;
            // isometric projection of rotated coords
            return V2(
                (x1 - z2) * ISO_COS30 * sc + off.x,
                ((x1 + z2) * 0.5 + y1) * sc + off.y,
            );
        },
        depth(v: Vector3): number {
            const x1 = v.x * cy + v.z * sy;
            const z1 = -v.x * sy + v.z * cy;
            const y1 = v.y * cx - z1 * sx;
            const z2 = v.y * sx + z1 * cx;
            return x1 + z2 - y1;
        },
    };
}

// ── Primitives ───────────────────────────────────────────────────────────

/** Map V2 polygon vertices to the XZ plane at given Y height */
function v2_to_xz(vertices: Vector2[], y: number): Vector3[] {
    return vertices.map(v => new Vector3(v.x, y, v.y));
}

/**
 * Extrude a 2D polygon along the Y axis.
 * Vertices define the XZ cross-section; Y is the extrusion axis.
 */
export function prism(vertices: Vector2[], height: number, style?: FaceStyle): Shape3D {
    const n = vertices.length;
    const bottom = v2_to_xz(vertices, 0);
    const top = v2_to_xz(vertices, height);
    const faces: Face[] = [];

    // side faces
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push(face(
            [bottom[i], bottom[j], top[j], top[i]],
            style,
        ));
    }

    // bottom face (winding: as given)
    faces.push(face([...bottom], style));

    // top face (reversed winding for outward-facing normal)
    faces.push(face([...top].reverse(), style));

    return make_shape(faces);
}

/** Rectangular prism centered at origin */
export function box(w: number, h: number, d: number, style?: FaceStyle): Shape3D {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const vertices = [
        V2(-hw, -hd), V2(hw, -hd), V2(hw, hd), V2(-hw, hd),
    ];
    return translate(prism(vertices, h, style), V3(0, -hh, 0));
}

/** Cylinder approximation (N-gon prism) */
export function cylinder(
    radius: number, height: number, segments: number = 16, style?: FaceStyle,
): Shape3D {
    const vertices: Vector2[] = [];
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        vertices.push(V2(Math.cos(a) * radius, Math.sin(a) * radius));
    }
    return prism(vertices, height, style);
}

/** Pyramid: 2D polygon base tapering to apex at (0, height, 0) */
export function pyramid(vertices: Vector2[], height: number, style?: FaceStyle): Shape3D {
    const n = vertices.length;
    const bottom = v2_to_xz(vertices, 0);
    const apex = new Vector3(0, height, 0);
    const faces: Face[] = [];

    // side triangles
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push(face([bottom[i], bottom[j], apex], style));
    }

    // bottom face
    faces.push(face([...bottom], style));

    return make_shape(faces);
}

// ── Shape Operations ─────────────────────────────────────────────────────

/** Translate all face corners of a shape */
export function translate(shape: Shape3D, offset: Vector3): Shape3D {
    return make_shape(
        shape.faces.map(f => face(
            f.corners.map(c => c.add(offset)),
            { fill: f.fill, stroke: f.stroke, strokewidth: f.strokewidth, opacity: f.opacity },
        )),
        shape.position.add(offset),
    );
}

/** Rotate all face corners around the Y axis */
export function rotateY(shape: Shape3D, angle: number): Shape3D {
    return make_shape(
        shape.faces.map(f => face(
            f.corners.map(c => c.rotateY(angle)),
            { fill: f.fill, stroke: f.stroke, strokewidth: f.strokewidth, opacity: f.opacity },
        )),
        shape.position.rotateY(angle),
    );
}

/** Rotate all face corners around the X axis */
export function rotateX(shape: Shape3D, angle: number): Shape3D {
    return make_shape(
        shape.faces.map(f => face(
            f.corners.map(c => c.rotateX(angle)),
            { fill: f.fill, stroke: f.stroke, strokewidth: f.strokewidth, opacity: f.opacity },
        )),
        shape.position.rotateX(angle),
    );
}

/** Rotate all face corners around the Z axis */
export function rotateZ(shape: Shape3D, angle: number): Shape3D {
    return make_shape(
        shape.faces.map(f => face(
            f.corners.map(c => c.rotateZ(angle)),
            { fill: f.fill, stroke: f.stroke, strokewidth: f.strokewidth, opacity: f.opacity },
        )),
        shape.position.rotateZ(angle),
    );
}

/** Combine multiple shapes into one (merges face lists) */
export function combine(...shapes: Shape3D[]): Shape3D {
    const faces: Face[] = [];
    for (const s of shapes) {
        faces.push(...s.faces);
    }
    return make_shape(faces);
}

/** Apply a style to all faces of a shape */
export function style_all(shape: Shape3D, style: FaceStyle): Shape3D {
    return make_shape(
        shape.faces.map(f => face(f.corners, { ...f, ...style })),
        shape.position.copy(),
    );
}

/** Apply per-face styles using an index-based callback */
export function style_faces(
    shape: Shape3D,
    fn: (f: Face, index: number) => FaceStyle,
): Shape3D {
    return make_shape(
        shape.faces.map((f, i) => face(f.corners, { ...f, ...fn(f, i) })),
        shape.position.copy(),
    );
}

// ── Render ───────────────────────────────────────────────────────────────

function face_centroid_depth(f: Face, proj: Projection): number {
    let sum = 0;
    for (const c of f.corners) sum += proj.depth(c);
    return sum / f.corners.length;
}

function project_face(f: Face, proj: Projection): Diagram {
    const pts = f.corners.map(c => proj.project(c));
    let d = polygon(pts);
    if (f.fill != null) d = d.fill(f.fill);
    if (f.stroke != null) d = d.stroke(f.stroke);
    if (f.strokewidth != null) d = d.strokewidth(f.strokewidth);
    if (f.opacity != null) d = d.opacity(f.opacity);
    return d;
}

/**
 * Project and depth-sort 3D shapes into a flat Diagram.
 * Uses painter's algorithm (centroid-based depth sort).
 */
export function render(shapes: Shape3D | Shape3D[], projection: Projection): Diagram {
    const list = Array.isArray(shapes) ? shapes : [shapes];

    // collect all faces
    const sorted: { depth: number; diagram: Diagram }[] = [];
    for (const shape of list) {
        for (const f of shape.faces) {
            sorted.push({
                depth: face_centroid_depth(f, projection),
                diagram: project_face(f, projection),
            });
        }
    }

    // painter's algorithm: furthest first
    sorted.sort((a, b) => b.depth - a.depth);

    if (sorted.length === 0) return polygon([]);
    return diagram_combine(...sorted.map(s => s.diagram));
}

// ── Utilities ────────────────────────────────────────────────────────────

/** Compute the outward-facing normal of a face (from first 3 corners) */
export function face_normal(f: Face): Vector3 {
    const a = f.corners[1].sub(f.corners[0]);
    const b = f.corners[2].sub(f.corners[0]);
    return a.cross(b).normalize();
}

// ── DepthElement (for mixed scenes) ─────────────────────────────────────

/** A depth-tagged diagram element for scene composition */
export interface DepthElement {
    depth: number;
    diagram: Diagram;
}

/** Project a 3D point to a filled circle */
export function project_point(
    pos: Vector3, radius: number, proj: Projection,
    style?: { fill?: string; stroke?: string; strokewidth?: number },
): DepthElement {
    const p = proj.project(pos);
    let d = regular_polygon(8, radius).position(p);
    if (style?.fill != null) d = d.fill(style.fill);
    if (style?.stroke != null) d = d.stroke(style.stroke);
    if (style?.strokewidth != null) d = d.strokewidth(style.strokewidth);
    return { depth: proj.depth(pos), diagram: d };
}

/** Project a 3D line segment */
export function project_line(
    from: Vector3, to: Vector3, proj: Projection,
    style?: { stroke?: string; strokewidth?: number; opacity?: number },
): DepthElement {
    const p0 = proj.project(from), p1 = proj.project(to);
    let d = line(p0, p1);
    if (style?.stroke != null) d = d.stroke(style.stroke);
    if (style?.strokewidth != null) d = d.strokewidth(style.strokewidth);
    if (style?.opacity != null) d = d.opacity(style.opacity);
    const midDepth = (proj.depth(from) + proj.depth(to)) / 2;
    return { depth: midDepth, diagram: d };
}

/** Project a 3D arrow (line with arrowhead) */
export function project_arrow(
    from: Vector3, to: Vector3, proj: Projection,
    headsize?: number,
    style?: { stroke?: string; strokewidth?: number; opacity?: number },
): DepthElement {
    const p0 = proj.project(from), p1 = proj.project(to);
    let d = arrow1(p0, p1, headsize ?? 0.5);
    if (style?.stroke != null) d = d.stroke(style.stroke);
    if (style?.strokewidth != null) d = d.strokewidth(style.strokewidth);
    if (style?.opacity != null) d = d.opacity(style.opacity);
    const midDepth = (proj.depth(from) + proj.depth(to)) / 2;
    return { depth: midDepth, diagram: d };
}

/** Project a text label at a 3D position */
export function project_text(
    pos: Vector3, str: string, proj: Projection,
    style?: { fontsize?: number; fill?: string; fontweight?: 'normal' | 'bold' | 'bolder' | 'lighter' },
): DepthElement {
    const p = proj.project(pos);
    let d = text(str).position(p);
    if (style?.fontsize != null) d = d.fontsize(style.fontsize);
    if (style?.fill != null) d = d.textfill(style.fill);
    if (style?.fontweight != null) d = d.fontweight(style.fontweight);
    return { depth: proj.depth(pos), diagram: d };
}

/** Convert Shape3D faces into DepthElements for mixing with other elements */
export function shape_to_elements(shape: Shape3D, proj: Projection): DepthElement[] {
    return shape.faces.map(f => ({
        depth: face_centroid_depth(f, proj),
        diagram: project_face(f, proj),
    }));
}

/** Sort and combine depth elements into a single Diagram (painter's algorithm) */
export function render_scene(elements: DepthElement[]): Diagram {
    const sorted = [...elements].sort((a, b) => b.depth - a.depth);
    if (sorted.length === 0) return polygon([]);
    return diagram_combine(...sorted.map(s => s.diagram));
}

/** Create 3 axis arrows with labels */
export function axes3d(
    length: number, proj: Projection,
    opts?: {
        labels?: [string, string, string];
        labelOffset?: number;
        headsize?: number;
        stroke?: string;
        strokewidth?: number;
        fontsize?: number;
    },
): DepthElement[] {
    const lbl = opts?.labels ?? ['X', 'Y', 'Z'];
    const off = opts?.labelOffset ?? (length * 0.12);
    const hs = opts?.headsize ?? (length * 0.06);
    const st = opts?.stroke ?? '#888888';
    const sw = opts?.strokewidth ?? 1.5;
    const fs = opts?.fontsize ?? 16;
    const origin = V3(0, 0, 0);
    const axes: [Vector3, Vector3, string][] = [
        [V3(-length, 0, 0), V3(length, 0, 0), lbl[0]],
        [V3(0, -length, 0), V3(0, length, 0), lbl[1]],
        [V3(0, 0, -length), V3(0, 0, length), lbl[2]],
    ];
    const elements: DepthElement[] = [];
    for (const [from, to, label] of axes) {
        elements.push(project_arrow(from, to, proj, hs, { stroke: st, strokewidth: sw }));
        // label near the positive tip
        const tipDir = to.sub(origin).normalize();
        elements.push(project_text(to.add(tipDir.scale(off)), label, proj, {
            fontsize: fs, fill: '#666666',
        }));
    }
    return elements;
}
