export function drawCrosshair(
    ctx: CanvasRenderingContext2D,
    options?: {
        size?: number;
        gap?: number;
        thickness?: number;
        color?: string;
    }
) {
    const {
        size = 10,
        gap = 4,
        thickness = 2,
        color = "#ffffff",
    } = options || {};

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.save();

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";

    ctx.beginPath();

    // Left
    ctx.moveTo(cx - gap - size, cy);
    ctx.lineTo(cx - gap, cy);

    // Right
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + size, cy);

    // Top
    ctx.moveTo(cx, cy - gap - size);
    ctx.lineTo(cx, cy - gap);

    // Bottom
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + size);

    ctx.stroke();
    ctx.restore();
}

export function writeText(
    ctx: CanvasRenderingContext2D,
    text: string,
    size: number,
    color: string,
    pos: { x: number; y: number },
    options?: {
        align?: CanvasTextAlign;
        baseline?: CanvasTextBaseline;
        font?: string;
    }
) {
    const {
        align = "center",
        baseline = "middle",
        font = "monospace",
    } = options || {};

    const x = pos.x * ctx.canvas.width;
    const y = pos.y * ctx.canvas.height;

    ctx.save();

    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    ctx.fillText(text, x, y);

    ctx.restore();
}

export function writeTextFade(
    ctx: CanvasRenderingContext2D,
    text: string,
    size: number,
    color: string,
    pos: { x: number; y: number },
    alpha: number, // 0 → 1
    options?: {
        align?: CanvasTextAlign;
        baseline?: CanvasTextBaseline;
        font?: string;
        shadow?: boolean;
    }
) {
    const {
        align = "center",
        baseline = "middle",
        font = "monospace",
        shadow = true,
    } = options || {};

    const x = pos.x * ctx.canvas.width;
    const y = pos.y * ctx.canvas.height;

    ctx.save();

    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    if (shadow) {
        ctx.shadowColor = "black";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    ctx.fillText(text, x, y);

    ctx.restore();
}


export function clearWithBlur(
    ctx: CanvasRenderingContext2D,
    strength = 0.15, // 0.05 = very blurry, 0.3 = sharp
    color = "black"
) {
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
}

export function drawBlurredUIBackground(
    uiCtx: CanvasRenderingContext2D,
    glCanvas: HTMLCanvasElement,
    blurPx = 8,
    alpha = 0.8
) {
    uiCtx.save();

    uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);

    uiCtx.globalAlpha = alpha;
    uiCtx.filter = `blur(${blurPx}px)`;

    uiCtx.drawImage(
        glCanvas,
        0,
        0,
        uiCtx.canvas.width,
        uiCtx.canvas.height
    );

    uiCtx.restore();
}


