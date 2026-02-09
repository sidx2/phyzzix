import { mat4, quat, vec3, vec4 } from "gl-matrix";
import { CollisionSystem, Entity, Geometry, Material, parseObj, Renderer, Scene, Transform } from "renderer";
import { EPA, GjkEpa } from "./gjkEpa2"
import  RAPIER from "@dimforge/rapier3d-compat"

const gjkEpa = new GjkEpa();

type Collision = {
    a: Entity;
    b: Entity;
    normal?: vec3;
    penetration?: number;
    lambda?: number;
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const transformVertices = (vertices: number[], model: mat4): number[] => {
    const out: number[] = [];

    const v4 = vec4.create();
    const res = vec4.create();

    for (let i = 0; i < vertices.length; i += 3) {
        v4[0] = vertices[i];
        v4[1] = vertices[i + 1];
        v4[2] = vertices[i + 2];
        v4[3] = 1.0; // IMPORTANT

        vec4.transformMat4(res, v4, model);

        out.push(res[0], res[1], res[2]);
    }

    return out;
}

export const createEntityFromObj = (renderer: Renderer, obj: string, pos: vec3, color: vec3): Entity => {
    const ObjData = parseObj(obj)
    const geometry = new Geometry(ObjData.vertices!, ObjData.normals!, ObjData.textures!);
    const mesh = renderer.createMesh(geometry);

    const entity = new Entity(
        mesh,
        new Transform({ position: pos }),
        new Material(color)
    );

    return entity;
}

export const applyGravity = (scene: Scene, gravity: vec3, dt: number) => {
    for (const entity of scene.entities as any) {
        if (entity.invMass === 0) continue;
        vec3.scaleAndAdd(entity.velocity, entity.velocity, gravity, dt);
    }
}

export const predictPositions = (scene: Scene, dt: number) => {
    for (const e of scene.entities as any) {
        if (e.invMass === 0) continue;
        vec3.copy(e.prevPosition, e.transform.position);
        vec3.scaleAndAdd(
            e.transform.position,
            e.transform.position,
            e.velocity,
            dt,
        );
        // debugger;
    }
}

export const solveConstraints = (collisionMap: Map<string, Collision>, dt: number) => {
    // compliance = 0 (rigid), if you want softness, use something like 0.0001
    const compliance = 0; 
    const tildeAlpha = compliance / (dt * dt);

    for (const col of collisionMap.values()) {
        const invMassSum = (col.a as any).invMass + (col.b as any).invMass;
        if (invMassSum === 0) continue;

        // 1. Re-calculate constraint C based on CURRENT positions
        // This is a simplified linear approximation
        const posA = col.a.transform.position;
        const posB = col.b.transform.position;
        
        // Calculate current penetration along the saved normal
        // This helps prevent the "exploding" problem mentioned in point 1
        const currentC = -col.penetration; 

        // 2. XPBD Lagrange Multiplier Update
        const deltaLambda = (-currentC - tildeAlpha * col.lambda) / (invMassSum + tildeAlpha);
        
        const prevLambda = col.lambda;
        col.lambda = Math.max(0, col.lambda + deltaLambda); // Inequality constraint (clamping)
        const p = (col.lambda - prevLambda); // The actual multiplier to apply

        const correction = vec3.scale(vec3.create(), col.normal, p);

        // 3. Apply position corrections
        vec3.scaleAndAdd(posA, posA, correction, (col.a as any).invMass);
        vec3.scaleAndAdd(posB, posB, correction, -(col.b as any).invMass);
    }
}


export const updateVelocites = (scene: Scene, dt: number) => {
    for (const e of scene.entities as any) {
        if (e.invMass === 0) continue;
        
        vec3.sub(
            e.velocity,
            e.transform.position,
            e.prevPosition,
        );

        // if (e.velocity[0] !== 0 || e.velocity[1] !== 0 || e.velocity[2] !== 0) {}; debugger;
        vec3.scale(e.velocity, e.velocity, 1 / dt);
    }
}

export const calculateCollisions = (collisionMap: Map<string, Collision>, entities: Entity[]) => {
    const alive = new Set<string>();

    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const a = entities[i];
            const b = entities[j];
            const id = `${a.id}|${b.id}`;

            const A = transformVertices(Array.from(a.geometry.positions), a.transform.getMatrix())
            const B = transformVertices(Array.from(b.geometry.positions), b.transform.getMatrix())

            const gjk = gjkEpa.GJK(A, B);

            const collision = { collide: gjk !== undefined, simplex: gjk }

            if (!collision.collide) continue;            

            const res =  EPA(collision.simplex, A, B); // {normal: vec3.create(), d: 0}; // EPA(collision.simplex, A, B);

            if (res.depth != 0)
            debugger;
            // enforce A → B normal
            // const ab = vec3.sub(vec3.create(), b.transform.position, a.transform.position);
            // if (vec3.dot(normal, ab) < 0) vec3.scale(normal, normal, -1);

            let col = collisionMap.get(id);
            if (!col) {
                col = { a, b, lambda: 0 };
                collisionMap.set(id, col);
            }

            col.normal = res.normal;
            col.penetration = res.depth;
            alive.add(id);
        }
    }

    // remove dead contacts
    for (const id of collisionMap.keys()) {
        if (!alive.has(id)) collisionMap.delete(id);
    }
};

export const createDynamicConvex = (
    obj: string,
    position: vec3,
    rotation: quat,
    world: RAPIER.World,
) => {
    const data = parseObj(obj);
    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position[0], position[1], position[2])
            .setRotation({
                x: rotation[0],
                y: rotation[1],
                z: rotation[2],
                w: rotation[3],
            })
    );

    const collider = RAPIER.ColliderDesc
        .convexHull(data.vertices)
        .setRestitution(0)
        .setFriction(1);

    world.createCollider(collider, body);

    return body;
}

