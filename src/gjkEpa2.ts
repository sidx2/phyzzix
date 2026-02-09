import { vec3, vec4 } from "gl-matrix";

const { dot, cross, copy , sub, negate, set, normalize, scale } = vec3;
const v3 = vec3.create;

const setArr = <T>(arr: T[], ...args: T[]) => {
    while (arr.length > 0) arr.shift();
    arr.push(...args);
}

export class GjkEpa {

    static MAX_GJK_ITERS = 16;
    static MAX_EPA_ITERS = 64;

    // private debugMinkowski: Mesh;
    // private debugSimplex: Mesh;
    // private debugPolytope: Mesh;
    // private debugFaceA: LineLoop;
    // private debugFaceB: LineLoop;
    // private debugFaceAClipped: LineLoop;
    // private debugFaceBClipped: LineLoop;
    // private debugNormal = new ArrowHelper();

    private debugEPA = false;
    private debugClipping = false;

    constructor() {
        // Game.gui.debug.add(this, 'debugEPA').name('Debug GJK / EPA');
        // Game.gui.debug.add(this, 'debugClipping').name('Debug clipping');
    }

    private tripleCross(a: vec3, b: vec3, c: vec3) {
        return cross(vec3.create(), cross(vec3.create(), a, b), c);
    }

    public GJK(
        colliderA: number[],
        colliderB: number[],
    ): vec3[] | undefined {

        /**
         * We need at least one vertex to start, so we’ll manually add it. 
         * The search direction for the first vertex doesn’t matter, but you 
         * may get less iterations with a smarter choice. 
         */
        const support = this.support(colliderA, colliderB, vec3.fromValues(0, 1, 0));

        /* Simplex is an array of points, max count is 4 */
        const simplex: vec3[] = [];
        simplex.unshift(support);

        /* New direction is towards the origin */
        const direction = vec3.negate(vec3.create(), support) // support.point.clone().negate();

        for (let i = 0; i < GjkEpa.MAX_GJK_ITERS; i++) {

            /**
             * In a loop, we’ll add another point. 
             * 
             * The exit condition is that this new point is not in front 
             * of the search direction. This would exit if the direction 
             * finds a vertex that was already the furthest one along it.
             */

            const support = this.support(colliderA, colliderB, direction);

            if (dot(support, direction) <= 0)
                return; /* No collision */

            simplex.unshift(support);

            /** 
             * Now that we have a line, we’ll feed it into a function that 
             * updates the simplex and search direction. 
             * It’ll return true or false to signify a collision.
             */
            if (this.nextSimplex(simplex, direction)) {
                // return true;
                return simplex;
            }
        }

        return;
    }

    private farthestPoint(s: number[], d: vec3): vec3 {
        const maxPoint = v3();
        let maxDist = -Infinity;
    
        for (let i = 0; i < s.length; i += 3) {
            const vertex = vec3.fromValues(s[i+0], s[i+1], s[i+2]);
            const distance = dot(vertex, d);

            if (distance > maxDist) {
                maxDist = distance;
                copy(maxPoint, vertex);
            }
        }
    
        return maxPoint;
    }

    /**
     * Returns the vertex on the Minkowski difference
     */
    public support(
        colliderA: number[],
        colliderB: number[],
        direction: vec3
    ): vec3 {

        const witnessA = this.farthestPoint(colliderA, direction); // colliderA.findFurthestPoint(direction);
        const witnessB = this.farthestPoint(colliderB, vec3.negate(vec3.create(), direction)); // colliderB.findFurthestPoint(direction.clone().negate());

        return vec3.sub(vec3.create(), witnessA, witnessB);
        // return new Support(witnessA, witnessB);
    }

    private nextSimplex(
        simplex: vec3[],
        direction: vec3
    ) {

        switch (simplex.length) {
            case 2: return this.Line(simplex, direction);
            case 3: return this.Triangle(simplex, direction);
            case 4: return this.Tetrahedron(simplex, direction);
        }

        /* This statement should never be reached */
        return false;
    }

    private sameDirection(direction: vec3, ao: vec3) {
        return dot(direction, ao) > 0;
    }

    private Line(
        simplex: vec3[],
        direction: vec3
    ) {
        const a = simplex[0];
        const b = simplex[1];

        const ab = vec3.sub(vec3.create(), b, a);
        const ao = vec3.negate(vec3.create(), a); // a.point.clone().negate();

        if (this.sameDirection(ab, ao)) {
            vec3.copy(direction, this.tripleCross(ab, ao, ab));
            // direction.copy(ab.clone().cross(ao).clone().cross(ab));
        } else {
            setArr(simplex, a); // simplex.assign([a]);
            copy(direction, ao);
        }

        return false;
    }

    private Triangle(
        simplex: vec3[],
        direction: vec3
    ) {
        const a = simplex[0];
        const b = simplex[1];
        const c = simplex[2];

        const ab = sub(v3(), b, a); //new Vec3().subVectors(b.point, a.point);
        const ac = sub(v3(), c, a); //new Vec3().subVectors(c.point, a.point);
        const ao = negate(v3() , a); // a.point.clone().negate();

        const abc = cross(v3(), a , b) // ab.clone().cross(ac);

        if (this.sameDirection(cross(v3(), abc, ac), ao)) {

            if (this.sameDirection(ac, ao)) {
                setArr(simplex, a, c) // simplex.assign([a, c]);
                copy(direction, this.tripleCross(ac, ao, ac)) // direction.copy(ac.clone().cross(ao).clone().cross(ac));

            } else {
                setArr(simplex, a, c) // simplex.assign([a, c]);
                return this.Line(simplex, direction);
            }

        } else {
            if (this.sameDirection(cross(v3(), ab, abc), ao)) {
                setArr(simplex, a, b) // simplex.assign([a, b]);
                return this.Line(simplex, direction);
            }

            else {
                if (this.sameDirection(abc, ao)) {
                   copy(direction, abc)  // direction.copy(abc);
                } else {
                    setArr(simplex, a, c, b); // simplex.assign([a, c, b]);
                    copy(direction, negate(v3(), abc)); // direction.copy(abc.negate());
                }
            }
        }

        return false;
    }

    private Tetrahedron(
        simplex: vec3[],
        direction: vec3
    ) {
        const a = simplex[0];
        const b = simplex[1];
        const c = simplex[2];
        const d = simplex[3];

        const ab = sub(v3(), b, a); // new Vec3().subVectors(b.point, a.point);
        const ac = sub(v3(), c, a); // new Vec3().subVectors(c.point, a.point);
        const ad = sub(v3(), d, a); // new Vec3().subVectors(d.point, a.point);
        const ao = negate(v3(), a) // a.point.clone().negate();

        const abc = cross(v3(), ab, ac); // ab.clone().cross(ac);
        const acd = cross(v3(), ac, ad); // ac.clone().cross(ad);
        const adb = cross(v3(), ad, ab); // ad.clone().cross(ab);

        if (this.sameDirection(abc, ao)) {
            setArr(simplex, a, b, c); // simplex.assign([a, b, c]);
            return this.Triangle(simplex, direction);
        }

        if (this.sameDirection(acd, ao)) {
            setArr(simplex, a, c, d); // simplex.assign([a, c, d]);
            return this.Triangle(simplex, direction);
        }

        if (this.sameDirection(adb, ao)) {
            setArr(simplex, a, d, b); // simplex.assign([a, d, b]);
            return this.Triangle(simplex, direction);
        }

        return true;
    }



    /**
     * EPA (Expanding Polytope Algorithm)
     * 
     * https://github.com/IainWinter/IwEngine/blob/master/IwEngine/src/physics/impl/GJK.cpp
     */
    public EPA(
        simplex: vec3[],
        colliderA: number[],
        colliderB: number[],
        // transformA: Pose,
        // transformB: Pose,
    ) {
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

        let { 
            normals, 
            minTriangle: minFace, 
            polygon: minPolygon 
        } = this.getFaceNormals(polytope, faces);

        const minNormal = v3();
        let minDistance = Infinity;

        let iterations = 0;
        while (minDistance == Infinity) {

            set(minNormal, normals[minFace][0], normals[minFace][1], normals[minFace][2]);
            minDistance = normals[minFace][3];

            if (iterations++ > GjkEpa.MAX_EPA_ITERS) {
                // console.error('Too many EPA iterations');
                break;
            }

            // const support = this.support(colliderA, colliderB, minNormal);
            const witnessA = this.farthestPoint(colliderA, minNormal) // colliderA.findFurthestPoint(minNormal);
            const witnessB = this.farthestPoint(colliderB, negate(v3(), minNormal)) // colliderB.findFurthestPoint(minNormal.clone().negate());

            const support = sub(v3(), witnessA, witnessB);

            const sDistance = dot(minNormal, support);

            if (Math.abs(sDistance - minDistance) > 0.001) {
                minDistance = Infinity;

                const uniqueEdges: Array<[number, number]> = [];

                for (let i = 0; i < normals.length; i++) {
                    const n = vec3.fromValues(normals[i][0], normals[i][1], normals[i][2]);

                    const faceDistance = normals[i][3];
                    if (this.sameDirection(n, support)) {
                        const f = i * 3;

                        this.addIfUniqueEdge(uniqueEdges, faces, f + 0, f + 1);
                        this.addIfUniqueEdge(uniqueEdges, faces, f + 1, f + 2);
                        this.addIfUniqueEdge(uniqueEdges, faces, f + 2, f + 0);

                        faces[f + 2] = faces[faces.length - 1]; faces.pop();
                        faces[f + 1] = faces[faces.length - 1]; faces.pop();
                        faces[f + 0] = faces[faces.length - 1]; faces.pop();

                        copy(normals[i], (normals[normals.length - 1])); normals.pop();

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
                } = this.getFaceNormals(polytope, newFaces);

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

        /* Debugging */
            
        /* Debug normal */
        // if (Game.debugOverlay && this.debugEPA) {
        //     this.debugNormal = new ArrowHelper(minNormal);
        //     this.debugNormal.setColor(0x00ffff);

        //     Game.scene?.scene.add(this.debugNormal);
        // }
        
        // /* Minkowski difference */
        // if (Game.debugOverlay && this.debugEPA) {

        //     const newVertices: Vec3[] = [];

        //     colliderA.verticesWorldSpace.forEach((v1) => {
        //         colliderB.verticesWorldSpace.forEach((v2) => {
        //             const newVertex = new Vec3(
        //                 v1.x - v2.x,
        //                 v1.y - v2.y,
        //                 v1.z - v2.z
        //             );
        //             newVertices.push(newVertex);
        //         });
        //     });

        //     // create a new convex mesh using the new vertices
        //     this.debugMinkowski = new Mesh(
        //         new ConvexGeometry(newVertices),
        //         new MeshBasicMaterial({ color: 0x444444, wireframe: true, wireframeLinewidth: 3, transparent: true, opacity: 0.5 })
        //     )
        //     Game.scene?.scene.add(this.debugMinkowski);
        // }

        // /* Debug polytope */
        // if (Game.debugOverlay && this.debugEPA) {
        //     const points = polytope;
        //     const bufferGeometry = new BufferGeometry();

        //     const indices = new Uint32Array(faces);
        //     const positions = new Float32Array(points.length * 3);
        //     points.forEach((support, i) => {
        //         positions[i * 3] = support.point.x;
        //         positions[i * 3 + 1] = support.point.y;
        //         positions[i * 3 + 2] = support.point.z;
        //     });

        //     bufferGeometry.setAttribute('position', new BufferAttribute(positions, 3));
        //     bufferGeometry.setIndex(new BufferAttribute(indices, 1));

        //     this.debugPolytope = new Mesh(bufferGeometry, new MeshBasicMaterial({ color: 0xff0000, wireframe: true, wireframeLinewidth: 3, transparent: true, opacity: 0.5 }));
        //     Game.scene?.scene.add(this.debugPolytope);
        // }

        // /* Find contact manifold for face-face contact */
        // const manifold: Array<[Vec3, Vec3]> = [];

        // const contact_facesA: {face: Face, dist: number}[] = [];
        // const contact_facesB: {face: Face, dist: number}[] = [];

        // const localNormalA = minNormal.clone().applyQuaternion(transformA.q.clone().conjugate());
        // const localNormalB = minNormal.clone().applyQuaternion(transformB.q.clone().conjugate());

        // if (colliderA instanceof MeshCollider) {
        //     for (let i = 0; i < colliderA.faces.length; i++) {
        //         const face = colliderA.faces[i];
        //         const dirDot = Vec3.dot(face.normal, localNormalA);
                
        //         if (dirDot > 0.999999) {
        //             const posDot = Vec3.dot(face.center, localNormalA);
                
        //             if (posDot > 0)
        //                 contact_facesA.push({ face, dist: posDot });
        //         }
        //     }
        // }
        // if (colliderB instanceof MeshCollider) {
        //     for (let i = 0; i < colliderB.faces.length; i++) {
        //         const face = colliderB.faces[i];
        //         const dirDot = Vec3.dot(face.normal, localNormalB);
                
        //         if (dirDot < -0.999999) {
        //             const posDot = Vec3.dot(face.center, localNormalB);

        //             if (posDot < 0)
        //                 contact_facesB.push({ face, dist: posDot });
        //         }
        //     }
        // }

        // if (contact_facesA.length && contact_facesB.length) {

        //     /* Face-face clipping algorithm */
            
        //     /* Create a matrix to transform the points to a 2D surface */
        //     const transformMatrix = new Matrix4();
        //     transformMatrix.makeTranslation(0, 0, 0);
        //     transformMatrix.makeRotationFromQuaternion(new Quat().setFromUnitVectors(minNormal, new Vec3(0, 0, 1)));

        //     /* Transform the 3D points to the 2D plane (z-coordinate becomes zero) */
        //     let projectedPoints2D_A: Vec2[] = [];
        //     let projectedPoints2D_B: Vec2[] = [];
            
        //     contact_facesA.sort((a,b) => b.dist - a.dist);
        //     contact_facesB.sort((a,b) => a.dist - b.dist);

        //     for (let j = 0; j < contact_facesA.length; j++) {

        //         /* Project 3D points into 2D space */
        //         for (let i = 0; i < 3; i++) {
        //             const pointA = colliderA.verticesWorldSpace[contact_facesA[j].face.indices[i]];

        //             const v3d = pointA.clone().applyMatrix4(transformMatrix);
        //             const v2d = new Vec2(v3d.x, v3d.y);
        //             let v2d_unique = true;

        //             for (const vertex of projectedPoints2D_A) {
        //                 if (vertex.distanceTo(v2d) < 0.001)
        //                     v2d_unique = false;
        //             }

        //             if (v2d_unique) projectedPoints2D_A.push(v2d);
        //         }
        //     }

        //     for (let j = 0; j < contact_facesB.length; j++) {

        //         /* Project 3D points into 2D space */
        //         for (let i = 0; i < 3; i++) {
        //             const pointB = colliderB.verticesWorldSpace[contact_facesB[j].face.indices[i]];

        //             const v3d = pointB.clone().applyMatrix4(transformMatrix);
        //             const v2d = new Vec2(v3d.x, v3d.y);
        //             let v2d_unique = true;

        //             for (const vertex of projectedPoints2D_B) {
        //                 if (vertex.distanceTo(v2d) < 0.001)
        //                     v2d_unique = false;
        //             }

        //             if (v2d_unique) projectedPoints2D_B.push(v2d);
        //         }
        //     }

        //     /* Make sure each 2d face projection is convex */
        //     const gs = new GrahamScan();
        //     projectedPoints2D_A = gs.setPoints(projectedPoints2D_A).getHull();
        //     projectedPoints2D_B = gs.setPoints(projectedPoints2D_B).getHull();

        //     /* Perform Sutherland-Hodgman clipping algorithm */
        //     let clippedPolygon2D: Vec2[] = SutherlandHodgmanClipping(projectedPoints2D_B, projectedPoints2D_A);

        //     /* Convert back from 2D clip space to 3D world space */
        //     const inverseTransformMatrix = transformMatrix.clone().invert();

        //     /* Define faces to project 2D points onto, since the z-coordinate will be lost after projection */
        //     const worldFaceNormal_A = contact_facesA[0].face.normal.clone().applyQuaternion(transformA.q);
        //     const worldFaceNormal_B = contact_facesB[0].face.normal.clone().applyQuaternion(transformB.q);
        //     const worldPoint_A = colliderA.verticesWorldSpace[contact_facesA[0].face.indices[0]];
        //     const worldPoint_B = colliderB.verticesWorldSpace[contact_facesB[0].face.indices[0]];
        //     const planeA = new Plane(worldFaceNormal_A, -Vec3.dot(worldFaceNormal_A, worldPoint_A));
        //     const planeB = new Plane(worldFaceNormal_B, -Vec3.dot(worldFaceNormal_B, worldPoint_B));
        //     // const plane = new Plane(minNormal, -Vec3.dot(minNormal, colliderA.verticesWorldSpace[contact_facesA[0].face.indices[0]]));
            
        //     const clippedPolygon3D_A: Array<Vec3> = []; // Debug only
        //     const clippedPolygon3D_B: Array<Vec3> = []; // Debug only

        //     for (const point2D of clippedPolygon2D) {
        //         const point3DHomogeneous = new Vec3(point2D.x, point2D.y, 0).applyMatrix4(inverseTransformMatrix);
        //         const point3D_A = new Vec3();
        //         const point3D_B = new Vec3();
        //         planeA.projectPoint(point3DHomogeneous, point3D_A);
        //         planeB.projectPoint(point3DHomogeneous, point3D_B);

        //         /* Add contact points to the contact manifold */
        //         manifold.push([point3D_A, point3D_B]);

        //         /* Debugging */
        //         clippedPolygon3D_A.push(point3D_A);
        //         clippedPolygon3D_B.push(point3D_B);
        //     }

        //     /* Debugging */
        //     if (Game.debugOverlay && this.debugClipping) {
        //         this.debugFaceA = new LineLoop( 
        //             new BufferGeometry().setFromPoints( projectedPoints2D_A ), 
        //             new MeshBasicMaterial({ color: 0xff0000 }) 
        //         );
        //         Game.scene?.scene.add(this.debugFaceA);

        //         this.debugFaceB = new LineLoop( 
        //             new BufferGeometry().setFromPoints( projectedPoints2D_B ), 
        //             new MeshBasicMaterial({ color: 0x00ff00 }) 
        //         );
        //         Game.scene?.scene.add(this.debugFaceB);
                    
        //         this.debugFaceAClipped = new LineLoop( 
        //             new BufferGeometry().setFromPoints( clippedPolygon3D_A ), 
        //             new LineBasicMaterial({ color: 0x00ffff, linewidth: 2 })
        //         );
        //         Game.scene?.scene.add(this.debugFaceAClipped);

        //         this.debugFaceBClipped = new LineLoop( 
        //             new BufferGeometry().setFromPoints( clippedPolygon3D_B ), 
        //             new LineBasicMaterial({ color: 0xff00ff, linewidth: 3 }) 
        //         );
        //         Game.scene?.scene.add(this.debugFaceBClipped);
        //     }
        // }

        // /* No face-face contact manifold was found - compute EPA contact point instead */
        // if (!manifold.length) {

        //     /* Contact point on the EPA polytope boundary */
        //     const contactPoint = Vec3.mul(minNormal, minDistance);
            
        //     /* Compute barycentric coordinates of the contact points on the nearest polytope face */
        //     const barycentric = this.computeBarycentricCoordinates(contactPoint, minPolygon);

        //     /* Find the world space contact points on the original shapes */
        //     let a = new Vec3().addScaledVector( minPolygon[0].witnessA, barycentric.x );
        //     let b = new Vec3().addScaledVector( minPolygon[1].witnessA, barycentric.y );
        //     let c = new Vec3().addScaledVector( minPolygon[2].witnessA, barycentric.z );
        //     const p1 = Vec3.add( a, b ).add( c );

        //     a = new Vec3().addScaledVector( minPolygon[0].witnessB, barycentric.x );
        //     b = new Vec3().addScaledVector( minPolygon[1].witnessB, barycentric.y );
        //     c = new Vec3().addScaledVector( minPolygon[2].witnessB, barycentric.z );
        //     const p2 = Vec3.add( a, b ).add( c );

        //     manifold.push([p1, p2]);
        // }

        debugger;
        return {
            normal:  negate(v3(), minNormal),// minNormal.negate(),
            // manifold,
            d: minDistance
        };
    }

    private computeBarycentricCoordinates(P: vec3, polygon: vec3[]): vec3 {

        const A = polygon[0];
        const B = polygon[1];
        const C = polygon[2];

        const v0 = sub(v3(), B, A); // B.clone().sub(A);
        const v1 = sub(v3(), C, A); // C.clone().sub(A);
        const v2 = sub(v3(), P, A); // P.clone().sub(A);
        
        const dot00 = dot(v0, v0);
        const dot01 = dot(v0, v1);
        const dot02 = dot(v0, v2);
        const dot11 = dot(v1, v1);
        const dot12 = dot(v1, v2);
        
        const denom = dot00 * dot11 - dot01 * dot01;
        const v = (dot11 * dot02 - dot01 * dot12) / denom;
        const w = (dot00 * dot12 - dot01 * dot02) / denom;
        const u = 1.0 - v - w;
        
        return vec3.fromValues(u, v, w);
    }

    private getFaceNormals(
        polytope: vec3[],
        faces: number[]
    ) {

        const normals: vec4[] = [];
        let minTriangle = 0;
        let minDistance = Infinity;
        
        let polygon: vec3[] = [];

        for (let i = 0; i < faces.length; i += 3) {
            const a = polytope[faces[i + 0]];
            const b = polytope[faces[i + 1]];
            const c = polytope[faces[i + 2]];

            const ab = sub(v3(), b, a);
            const ac = sub(v3(), c, a);

            const normal = cross(v3(), ab, ac);
            normalize(normal, normal);
            // const normal = new Vec3()
            //     .subVectors(b.point, a.point)
            //     .cross(c.point.clone().sub(a.point))
            //     .normalize();

            let distance = dot(normal, a); // normal.dot(a.point);

            if (distance < 0) {
                // normal.negate();
                scale(normal, normal, -1)
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

    private addIfUniqueEdge(
        edges: Array<[number, number]>,
        faces: Array<number>,
        a: number,
        b: number
    ): void {

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

}

// --- Scratch Variables (Memory Optimization) ---
// We create these once to avoid 'new Float32Array' inside loops
const TMP_AB = vec3.create();
const TMP_AC = vec3.create();
const TMP_VEC = vec3.create();
const TMP_NORMAL = vec3.create();

// Constants
const TOLERANCE = 0.00001;
const MAX_EPA_ITERS = 64;

export const EPA = (
    simplex: vec3[],
    colliderA: number[],
    colliderB: number[],
): { normal: vec3, depth: number } | undefined => {

    // 1. Initialize Polytope from GJK Simplex
    // The simplex from GJK (tetrahedron) becomes the initial polytope
    const polytope: vec3[] = [...simplex]; // Copy to avoid mutating original

    // Initial winding order for a tetrahedron (CCW)
    const faces = [
        0, 1, 2,
        0, 3, 1,
        0, 2, 3,
        1, 3, 2
    ];

    // Calculate initial normals and find the closest face to origin
    let { normals, minFace } = getFaceNormals(polytope, faces);

    const minNormal = vec3.create();
    let minDistance = Infinity;

    for (let iteration = 0; iteration < MAX_EPA_ITERS; iteration++) {
        
        // Get the closest face information
        minDistance = normals[minFace][3]; // .w component holds distance
        vec3.set(minNormal, normals[minFace][0], normals[minFace][1], normals[minFace][2]);

        // 2. Search for a new support point in the direction of the face normal
        const support = supportPoint(colliderA, colliderB, minNormal);

        // 3. Convergence Check
        // Calculate how much further the new point is compared to the current face
        const sDistance = vec3.dot(minNormal, support);

        if (Math.abs(sDistance - minDistance) < TOLERANCE) {
            // We haven't found a significantly further point. We are done.
            return {
                normal: minNormal, // Normal pointing out of A towards B
                depth: sDistance   // Penetration depth
            };
        }

        // 4. Horizon Expansion
        // We need to remove faces that can "see" the new support point
        const uniqueEdges: Array<[number, number]> = [];
        
        // Iterate backwards so we can safely remove faces
        for (let i = 0; i < normals.length; i++) {
            const n = vec3.fromValues(normals[i][0], normals[i][1], normals[i][2]);
            const dist = normals[i][3];

            // CRITICAL FIX: Check if point is strictly *outside* the plane distance
            // standard GJK implementations often fail here by just checking dot > 0
            if (vec3.dot(n, support) > dist + TOLERANCE) {
                const f = i * 3; // Face index in 'faces' array

                // Add edges to the horizon list. 
                // If an edge is shared by two removed faces, it cancels out (inside the hole).
                // If it's shared by one removed and one remaining, it's on the border (horizon).
                addIfUniqueEdge(uniqueEdges, faces, f + 0, f + 1);
                addIfUniqueEdge(uniqueEdges, faces, f + 1, f + 2);
                addIfUniqueEdge(uniqueEdges, faces, f + 2, f + 0);

                // Remove this face (swap-and-pop for O(1) removal)
                faces[f + 2] = faces[faces.length - 1]; faces.pop();
                faces[f + 1] = faces[faces.length - 1]; faces.pop();
                faces[f + 0] = faces[faces.length - 1]; faces.pop();

                normals[i] = normals[normals.length - 1]; normals.pop();

                i--; // Adjust index since we swapped
            }
        }
        
        // If no edges were unique, the new point was inside the hull (convexity issue or tolerance)
        if (uniqueEdges.length === 0) {
            break; 
        }

        // 5. Reconstruct Polytope
        // Add the new support point to vertices
        const newIdx = polytope.length;
        polytope.push(support);

        // Create new faces connecting the horizon edges to the new point
        const newFaces: number[] = [];
        for (const [a, b] of uniqueEdges) {
            newFaces.push(a);
            newFaces.push(b);
            newFaces.push(newIdx);
        }

        faces.push(...newFaces);

        // 6. Recalculate normals for ONLY the new faces to save performance
        // (For simplicity here we recalc all, but in optimized C++ you'd only calc new ones)
        // Note: The recursive nature of getFaceNormals in your original code was slightly complex.
        // It's safer to just re-scan or append. Here we append.
        
        const newNormalData = getFaceNormals(polytope, newFaces);
        
        let newMinDistance = Infinity;
        let newMinFace = -1;

        // Check old normals for the closest face
        for (let i = 0; i < normals.length; i++) {
            if (normals[i][3] < newMinDistance) {
                newMinDistance = normals[i][3];
                newMinFace = i;
            }
        }

        // Check new normals for the closest face
        for (let i = 0; i < newNormalData.normals.length; i++) {
            if (newNormalData.normals[i][3] < newMinDistance) {
                newMinDistance = newNormalData.normals[i][3];
                newMinFace = normals.length + i; // Offset by existing count
            }
        }

        // Merge arrays
        normals.push(...newNormalData.normals);
        minFace = newMinFace;
    }

    // Fallback if iteration limit hit
    return {
        normal: minNormal,
        depth: minDistance
    };
};

/**
 * Helper: Calculates normals for a list of faces.
 * Ensures normals point away from origin (assuming origin is inside the hull).
 */
const getFaceNormals = (
    polytope: vec3[],
    faces: number[]
): { normals: vec4[], minFace: number } => {

    const normals: vec4[] = [];
    let minFace = 0;
    let minDistance = Infinity;

    for (let i = 0; i < faces.length; i += 3) {
        const a = polytope[faces[i + 0]];
        const b = polytope[faces[i + 1]];
        const c = polytope[faces[i + 2]];

        // Calculate Normal: (b-a) x (c-a)
        vec3.sub(TMP_AB, b, a);
        vec3.sub(TMP_AC, c, a);
        vec3.cross(TMP_NORMAL, TMP_AB, TMP_AC);
        vec3.normalize(TMP_NORMAL, TMP_NORMAL);

        // Calculate distance from origin to plane: dot(n, a)
        let distance = vec3.dot(TMP_NORMAL, a);

        // Enforce winding order: If distance is negative, the normal points 
        // TOWARDS the origin. We must flip it to point OUTWARDS.
        if (distance < 0) {
            vec3.scale(TMP_NORMAL, TMP_NORMAL, -1);
            distance *= -1;
            
            // Note: strict topology would require swapping b and c in 'faces' here
            // to maintain CCW winding, but for pure collision normal finding, 
            // flipping the vector is often sufficient.
        }

        normals.push(vec4.fromValues(
            TMP_NORMAL[0], TMP_NORMAL[1], TMP_NORMAL[2],
            distance
        ));

        if (distance < minDistance) {
            minDistance = distance;
            minFace = normals.length - 1;
        }
    }

    return { normals, minFace };
};

/**
 * Helper: Maintains the "Horizon" of the polytope.
 * If an edge (A->B) is added, and its reverse (B->A) is already there,
 * it means the edge is internal (shared by two removed faces) and should be removed.
 */
const addIfUniqueEdge = (
    edges: Array<[number, number]>,
    faces: number[],
    a: number,
    b: number
) => {
    // Find if the reverse edge exists
    // We look for an edge that starts with faces[b] and ends with faces[a]
    const reverseIdx = edges.findIndex(edge => edge[0] === faces[b] && edge[1] === faces[a]);

    if (reverseIdx !== -1) {
        // It exists, so this edge is shared. Remove it.
        edges.splice(reverseIdx, 1);
    } else {
        // It's new, add it.
        edges.push([faces[a], faces[b]]);
    }
};

/**
 * Helper: Standard Minkowski Difference support function
 */
const supportPoint = (colliderA: number[], colliderB: number[], direction: vec3): vec3 => {
    const witnessA = getFarthestPoint(colliderA, direction);
    
    vec3.negate(TMP_VEC, direction);
    const witnessB = getFarthestPoint(colliderB, TMP_VEC);

    return vec3.sub(vec3.create(), witnessA, witnessB);
};

const getFarthestPoint = (vertices: number[], d: vec3): vec3 => {
    let maxDot = -Infinity;
    let index = -1;

    for (let i = 0; i < vertices.length; i += 3) {
        const dot = vertices[i] * d[0] + vertices[i+1] * d[1] + vertices[i+2] * d[2];
        if (dot > maxDot) {
            maxDot = dot;
            index = i;
        }
    }

    return vec3.fromValues(vertices[index], vertices[index+1], vertices[index+2]);
}
