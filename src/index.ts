import { CollisionSystem, Entity, gjk3d, parseObj, Renderer, Scene, transformVertices } from "renderer";
import { mat4, quat, vec3 } from "gl-matrix";
import { groundObj, cubeObj, floorObj } from "./data";
import { applyGravity, calculateCollisions, createDynamicConvex, createEntityFromObj, lerp, predictPositions, solveConstraints, updateVelocites } from "./utils"
import { FPSController } from "./FPSController";
import { clearWithBlur, drawBlurredUIBackground, drawCrosshair, writeTextFade } from "./ui"

// import * as RAPIER from "@dimforge/rapier3d"

import RAPIER from "@dimforge/rapier3d-compat";

const main = async () => {
    await RAPIER.init({});
    const gunshot = new Audio("./gunshot.wav");

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const uiCanvas = document.getElementById("uiCanvas") as HTMLCanvasElement;
    setCanvasSize(canvas);
    setCanvasSize(uiCanvas);

    const uiCtx = uiCanvas.getContext("2d");

    const renderer = new Renderer(canvas);

    const scene = new Scene();

    const gravity = { x: 0, y: -9.81, z: 0 };
    const world = new RAPIER.World(gravity);

    const groundData = parseObj(floorObj);
    const groundEntity = createEntityFromObj(renderer, floorObj, vec3.fromValues(0, -2, -5), vec3.fromValues(1, 1, 1));
    const groundBody = world.createRigidBody(
        // RAPIER.ColliderDesc.cuboid(100, 0.1, 100)

        RAPIER.RigidBodyDesc.fixed()
            .setTranslation(0, -2, -5)
        // .setRotation({
        //     x: 0,
        //     y: 0,
        //     z: 0,
        //     w: 0,
        // })
        // .setScale({ x: 10, y: 10, z: 10 })
    );

    const indices = new Uint32Array(groundData.vertices.length / 3);
    for (let i = 0; i < indices.length; i++) indices[i] = i;

    const groundCollider =
        RAPIER.ColliderDesc.trimesh(groundData.vertices, indices)


    groundCollider.setRestitution(0.0);
    groundCollider.setFriction(1.0);

    scene.add(groundEntity);
    world.createCollider(groundCollider, groundBody);

    const things: [Entity, any][] = []

    const r = Math.random;
    for (let i = 0; i < 40; i++) {
        const position = vec3.fromValues(r() * 10, r() * 10, r()*10);
        const color = vec3.fromValues(r(), r(), r());
        const cube = createEntityFromObj(renderer, cubeObj, position, color);
        scene.add(cube);
        const body = createDynamicConvex(cubeObj, position, quat.create(), world);

        things.push([cube, body])
    }
    // const cube2 = createEntityFromObj(renderer, cubeObj, vec3.fromValues(1, 1, -5), vec3.fromValues(0.3, 0.7, 0.8));
    // const cube3 = createEntityFromObj(renderer, cubeObj, vec3.fromValues(1, 1, -5), vec3.fromValues(0.3, 0.7, 0.8));

    // scene.add(cube1); scene.add(cube2); scene.add(cube3);

    // const body1 = createDynamicConvex(cubeObj, vec3.fromValues(-1, 1, -5), quat.create(), world);
    // const body2 = createDynamicConvex(cubeObj, vec3.fromValues(2.5, 1, -5), quat.create(), world);
    // const body3 = createDynamicConvex(cubeObj, vec3.fromValues(0.5, 3, -5), quat.create(), world);

    const keys: Record<string, boolean> = {}
    const mouseDelta: { x: number, y: number } = { x: 0, y: 0 };

    const projection = mat4.perspective(mat4.create(), 135 * Math.PI / 180 / 2, 16 / 9, 1e-3, 1e3);
    const fpsController = new FPSController();
    
    const dt = 1/60;
    fpsController.update(keys, mouseDelta, dt);
    const loop = () => {
        renderer.clearCanvas(vec3.fromValues(0x18 / 255, 0x18 / 255, 0x18 / 255));

        if (document.pointerLockElement === canvas) {
            fpsController.update(keys, mouseDelta, dt);
        }

        world.step();

        for (const thing of things) {
            const target = thing[0];
            const body = thing[1];
            const t1 = body.translation();
            const r1 = body.rotation();

            vec3.set(target.transform.position, t1.x, t1.y, t1.z);
            quat.set(target.transform.rotation, r1.x, r1.y, r1.z, r1.w)
        }

        const view = fpsController.getViewMatrix();
        const vp = mat4.mul(mat4.create(), projection, view);

        renderer.render(scene, vp);

        
        if (document.pointerLockElement) {
            uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

            drawCrosshair(uiCtx, {
                size: 12,
                gap: 5,
                thickness: 2,
                color: "#ffffff",
            });
        } else {
            drawBlurredUIBackground(uiCtx, canvas);

            writeTextFade(
                uiCtx,
                "W A S D to move",
                100,
                "#ffffff",
                { x: 0.5, y: 0.5 },
                0.5
            );
        
            writeTextFade(
                uiCtx,
                "Click anywhere to continue",
                65,
                "#cccccc",
                { x: 0.5, y: 0.65 },
                0.5
            );
        }

        window.requestAnimationFrame(loop);
    }

    loop();

    window.addEventListener("click", (e) => {
        if (!gunshot.paused) return;
        gunshot.play();
        const origin = fpsController.position;
        const dir = fpsController.forward;
        
        const ray = new RAPIER.Ray(
            { x: origin[0], y: origin[1], z: origin[2] },
            { x: dir[0], y: dir[1], z: dir[2] }
        );

        const hit = world.castRay(
            ray,
            1000.0,        // max distance
            true           // solid
        );

        if (hit) {
            const collider = hit.collider;
            // const toi = hit.timeOfImpact;

            // const hitPoint = vec3.scaleAndAdd(
            //     vec3.create(),
            //     origin,
            //     dir,
            //     toi
            // );

            const body = collider.parent();

            if (body && body.isDynamic()) {
                const impulseStrenth = 200;
                
                body.applyImpulse(
                    {
                        x: dir[0] * impulseStrenth,
                        y: dir[1] * impulseStrenth,
                        z: dir[2] * impulseStrenth,
                    },
                    true,
                );

                
            }
        }
    })

    uiCanvas.addEventListener("click", async () => {
        await canvas.requestPointerLock();
    })

    window.addEventListener("mousemove", (e) => {
        mouseDelta.x = e.movementX;
        mouseDelta.y = e.movementY;
    });

    window.addEventListener("keydown", (ev) => {
        keys[ev.key] = true;
    })

    window.addEventListener("keyup", (ev) => {
        keys[ev.key] = false;
    });

    function setCanvasSize(canvas: HTMLCanvasElement) {
        const aspect = 16 / 9;
        const winW = window.innerWidth;
        const winH = window.innerHeight;
    
        let canvasW = winW;
        let canvasH = winW / aspect;
    
        // If height overflows, fit by height instead
        if (canvasH > winH) {
            canvasH = winH;
            canvasW = winH * aspect;
        }
    
        const dpr = window.devicePixelRatio || 1;
    
        canvas.style.width = canvasW + "px";
        canvas.style.height = canvasH + "px";
    
        canvas.width = canvasW * dpr;
        canvas.height = canvasH * dpr;
     
    }
}

main();

