import { mat4, vec3, vec4 } from "gl-matrix";
import { transformVertices } from "renderer";

const { dot } = vec3;

export const gjk3d = (s1: number[], s2: number[]): { collide: boolean, simplex: vec3[] } => {
    const noCollision = {
        collide: false,
        simplex: [] as vec3[],
    };

    if (s1.length % 3 != 0 || s2.length % 3 != 0) {
        console.error("invalid vertices for s1 or s2");
        return noCollision;
    }

    let d = vec3.fromValues(1, 0, 0);
    const S = supportPoint(s1, s2, d)
    const points = [S];

    vec3.normalize(d, vec3.negate(d, S));

    for (let i = 0; i < 64; i++) {
        const A = supportPoint(s1, s2, d);

        if (dot(A, d) < 0) {
            return noCollision;
        }

        points.push(A);

        if (handleSimplex(points, d)) {
            return {
                collide: true,
                simplex: points,
            };
        }
    }

    return noCollision;
}

const handleSimplex = (points: vec3[], d: vec3): boolean => {

    switch (points.length) {
        case 0:
        case 1:
            console.error(`Don't know how to handle nothing or a point`);
            break;

        case 2: { // line
            const A = points[points.length - 1];
            const B = points[points.length - 2];

            const AB = newVec3(); vec3.sub(AB, B, A);
            const AO = newVec3(); vec3.negate(AO, A);

            if (dot(AB, AO) > 0) {
                const [x, y, z] = tripleCross(AB, AO, AB);
                setArr(points, A, B);
                vec3.set(d, x, y, z);
            } else {
                const [x, y, z] = Array.from(AO);
                setArr(points, A);
                vec3.set(d, x, y, z);
            }

            return false;
            break;
        }

        case 3: { // triangle
            const A = points[2];
            const B = points[1];
            const C = points[0];

            const AB = newVec3(); vec3.sub(AB, B, A);
            const AC = newVec3(); vec3.sub(AC, C, A);
            const AO = newVec3(); vec3.negate(AO, A);

            const AB_AC = newVec3(); vec3.cross(AB_AC, AB, AC);
            const ABC = AB_AC;

            const AB_Edge = cross(AB, ABC);
            const AC_Edge = cross(ABC, AC);

            const STAR = () => {
                if (dot(AB, AO) > 0) {
                    const [x, y, z] = tripleCross(AB, AO, AB);
                    setArr(points, A, B)
                    vec3.set(d, x, y, z);
                } else {
                    setArr(points, A);
                    vec3.copy(d, AO);
                }
            }

            if (dot(cross(ABC, AC), AO) > 0) {
                if (dot(AC, AO) > 0) {
                    const [x, y, z] = tripleCross(AC, AO, AC);
                    vec3.set(d, x, y, z);
                }
                else STAR();

            } else {
                if (dot(cross(AB, ABC), AO) > 0) {
                    STAR();
                } else {
                    if (dot(ABC, AO) > 0) {
                        setArr(points, A, B, C);
                        vec3.copy(d, ABC);
                    } else {
                        setArr(points, A, C, B);
                        vec3.negate(d, ABC);
                    }
                }
            }

            return false;
            break;
        }

        case 4: { // tetrahedron
            const A = points[3];
            const B = points[2];
            const C = points[1];
            const D = points[0];

            const AB = newVec3(); vec3.sub(AB, B, A);
            const AC = newVec3(); vec3.sub(AC, C, A);
            const AD = newVec3(); vec3.sub(AD, D, A);
            const AO = newVec3(); vec3.negate(AO, A);

            const ABC = cross(AB, AC);
            const ACD = cross(AC, AD);
            const ADB = cross(AD, AB);

            if (dot(ABC, AD) > 0) vec3.negate(ABC, ABC);

            if (dot(ABC, AO) > 0) {
                setArr(points, A, B, C);
                vec3.copy(d, ABC);
                return false;
            }

            const AB_vec = AB;
            if (dot(ACD, AB_vec) > 0) vec3.negate(ACD, ACD);

            if (dot(ACD, AO) > 0) {
                setArr(points, A, C, D);
                vec3.copy(d, ACD);
                return false;
            }

            const AC_vec = AC;
            if (dot(ADB, AC_vec) > 0) vec3.negate(ADB, ADB);

            if (dot(ADB, AO) > 0) {
                setArr(points, A, D, B);
                vec3.copy(d, ADB);
                return false;
            }

            return true;
            break;
        }

        case 5:
        case 6:
            console.error(`Don't know how to handle polygon`);
            break;
    }
    return false;
}

const setArr = <T>(arr: T[], ...args: T[]) => {
    while (arr.length > 0) arr.shift();
    arr.push(...args);
}

const tripleCross = (a: vec3, b: vec3, c: vec3) => {
    return cross(cross(a, b), c);
}

const supportPoint = (s1: number[], s2: number[], d: vec3): vec3 => {
    const fs1 = farthestPoint(s1, d);
    let dNeg = newVec3();
    vec3.negate(dNeg, d);
    const fs2 = farthestPoint(s2, dNeg);

    const res = newVec3();
    vec3.sub(res, fs1, fs2);

    return res;
}

const farthestPoint = (s: number[], d: vec3): vec3 => {
    let max = vec3.fromValues(s[0], s[1], s[2]);
    let maxdot = dot(max, d);

    for (let i = 3; i < s.length; i += 3) {
        const dot =
            s[i] * d[0] +
            s[i + 1] * d[1] +
            s[i + 2] * d[2];

        if (dot > maxdot) {
            maxdot = dot;
            max[0] = s[i];
            max[1] = s[i + 1];
            max[2] = s[i + 2];
        }
    }

    return max;
}

const newVec3 = (): vec3 => {
    return vec3.create();
}

const cross = (a: vec3, b: vec3): vec3 => {
    const res = newVec3();
    return vec3.cross(res, a, b);
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

export const _sameDirection = (a: vec3, b: vec3): boolean => {
    return vec3.dot(a, b) > 0;
}

export const _getFaceNormals = (polytope: vec3[], faces: number[]) => {
    let normals: vec4[] = [];
    let minTriangle = 0;
    let minDist = 1e9 + 7;

    for (let i = 0; i < faces.length; i += 3) {
        let a = polytope[faces[i + 0]];
        let b = polytope[faces[i + 1]];
        let c = polytope[faces[i + 2]];

        let ab = vec3.sub(newVec3(), b, a);
        let ac = vec3.sub(newVec3(), c, a);

        let normal = vec3.normalize(newVec3(), vec3.cross(vec3.create(), ab, ac));
        let dist = vec3.dot(normal, a);

        if (dist < 0) {
            dist *= -1;
            vec3.scale(normal, normal, -1);
        }

        normals.push(vec4.fromValues(normal[0], normal[1], normal[2], dist));

        if (dist < minDist) {
            minTriangle = i / 3;
            minDist = dist;
        }
    }

    return { normals, minTriangle };
}

export const _addIfUniqueEdge = (
    edges: [number, number][],
    faces: number[],
    a: number,
    b: number,
) => {
    for (let i = 0; i < edges.length; i++) {
        if (edges[i][0] === b && edges[i][1] === a) {
            edges.splice(i, 1);
            return;
        }
    }
    edges.push([faces[a], faces[b]]);
}


export const EPA = (
    simplex: vec3[],
    colliderA: number[],
    colliderB: number[],
    // transformA: mat4,
    // transformB: mat4,
) => {

    // colliderA = transformVertices(colliderA, transformA);
    // colliderB = transformVertices(colliderB, transformB);

    /* EPA (Expanding Polytope Algorithm) */
    const polytope: vec3[] = [];

    for (let i = 0; i < simplex.length; i++)
        polytope.push(simplex[i]);

    const faces = [
        0, 1, 2,
        0, 3, 1,
        0, 2, 3,
        1, 3, 2
    ];

    debugger;

    let { 
        normals, 
        minTriangle: minFace, 
        polygon: minPolygon 
    } = getFaceNormals(polytope, faces);

    const minNormal = vec3.create();
    let minDistance = Infinity;

    let iterations = 0;
    while (minDistance == Infinity) {

        vec3.set(minNormal, normals[minFace][0], normals[minFace][1], normals[minFace][2]);
        minDistance = normals[minFace][3];

        if (iterations++ > 69) {
            // console.error('Too many EPA iterations');
            break;
        }

        // const support = this.support(colliderA, colliderB, minNormal);
        // const witnessA = farthestPoint(colliderA, minNormal)
        // const minNormalNeg = vec3.scale(vec3.create(), normals, -1);
        // const witnessB = farthestPoint(colliderB, minNormalNeg);

        const support = supportPoint(colliderA, colliderB, minNormal);

        const sDistance = vec3.dot(minNormal, support);

        if (Math.abs(sDistance - minDistance) > 0.001) {
            minDistance = Infinity;

            const uniqueEdges: Array<[number, number]> = [];

            for (let i = 0; i < normals.length; i++) {
                const n = vec3.fromValues(normals[i][0], normals[i][1], normals[i][2]);

                if (_sameDirection(n, support)) {
                    const f = i * 3;

                    addIfUniqueEdge(uniqueEdges, faces, f + 0, f + 1);
                    addIfUniqueEdge(uniqueEdges, faces, f + 1, f + 2);
                    addIfUniqueEdge(uniqueEdges, faces, f + 2, f + 0);

                    faces[f + 2] = faces[faces.length - 1]; faces.pop();
                    faces[f + 1] = faces[faces.length - 1]; faces.pop();
                    faces[f + 0] = faces[faces.length - 1]; faces.pop();

                    normals[i] = (normals[normals.length - 1]); normals.pop();

                    i--;
                }
            }

            if (uniqueEdges.length == 0)
                break;

            const newFaces: Array<number> = [];

            for (const [edge1, edge2] of uniqueEdges) {
                newFaces.push(edge1);
                newFaces.push(edge2);
                newFaces.push(polytope.length);
            }

            polytope.push(support);

            const {
                normals: newNormals,
                minTriangle: newMinFace,
                polygon: newPolygon,
            } = getFaceNormals(polytope, newFaces);

            let newMinDistance = Infinity;

            for (let i = 0; i < normals.length; i++) {
                if (normals[i][3] < newMinDistance) {
                    newMinDistance = normals[i][3];
                    minFace = i;
                }
            }

            if (newNormals[newMinFace][3] < newMinDistance) {
                minFace = newMinFace + normals.length;
                minPolygon = newPolygon;
            }

            faces.push(...newFaces);
            normals.push(...newNormals);
        }
    }

    if (minDistance == Infinity)
        return;

    const minNormalNeg = vec3.scale(vec3.create(), minNormal, -1);
    return {
        normal: minNormalNeg,
        // manifold,
        d: minDistance
    };
}

export const getFaceNormals = (
    polytope: vec3[],
    faces: number[]
) => {

    const normals: vec4[] = [];
    let minTriangle = 0;
    let minDistance = Infinity;
    
    let polygon: vec3[] = [];

    for (let i = 0; i < faces.length; i += 3) {
        const a = polytope[faces[i + 0]];
        const b = polytope[faces[i + 1]];
        const c = polytope[faces[i + 2]];

        const ab = vec3.sub(vec3.create(), b, a);
        const ac = vec3.sub(vec3.create(), c, a);

        const normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), ab, ac));
        // const normal = new Vec3()
        //     .subVectors(b.point, a.point)
        //     .cross(c.point.clone().sub(a.point))
        //     .normalize();

        let distance = vec3.dot(normal, a);

        if (distance < 0) {
            vec3.negate(normal, normal);
            // normal.negate();
            distance *= -1;
        }

        normals.push(vec4.fromValues(
            normal[0],
            normal[1],
            normal[2],
            distance
        ));

        if (distance < minDistance) {
            minTriangle = i / 3;
            minDistance = distance;

            polygon[0] = a;
            polygon[1] = b;
            polygon[2] = c;
        }
    }

    return { 
        normals, 
        minTriangle, 
        polygon 
    };
}

export const addIfUniqueEdge = (
    edges: Array<[number, number]>,
    faces: Array<number>,
    a: number,
    b: number
): void  => {

    //      0--<--3
    //     / \ B /   A: 2-0
    //    / A \ /    B: 0-2
    //   1-->--2

    const reverse = edges.find(edge => edge[0] === faces[b] && edge[1] === faces[a]);

    if (reverse !== undefined) {
        const index = edges.indexOf(reverse);
        edges.splice(index, 1);
    } else {
        edges.push([faces[a], faces[b]]);
    }
}
