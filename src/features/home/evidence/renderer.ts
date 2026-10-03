import { buildParticles } from './particles';

/**
 * WebGL renderer for the "from molecule to evidence" scene: one point cloud
 * that morphs molecule → Kaplan-Meier curves → topic network as the visitor
 * scrolls through the story steps. Plain WebGL (1 or 2, GLSL ES 1.0): a single
 * draw call, no 3D engine. Loaded on demand, desktop only, never under
 * prefers-reduced-motion (the static SVG figures cover those cases).
 */

export interface EvidenceSceneOptions {
  canvas: HTMLCanvasElement;
  section: HTMLElement;
  /** The three story steps (molecule, trial, evidence), in order. */
  steps: HTMLElement[];
  /** One element per topic, positioned over its node. */
  labels: HTMLElement[];
  topicCounts: number[];
  /** Called when WebGL is unavailable or the context is lost. */
  onFail: () => void;
}

const VERTEX = `
attribute vec3 aPos0;
attribute vec3 aPos1;
attribute vec3 aPos2;
attribute vec3 aCol0;
attribute vec3 aCol1;
attribute vec3 aCol2;
attribute vec2 aMeta;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform float uStage;
uniform float uTime;
uniform float uIntro;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uPointSize;
varying vec3 vColor;
varying float vAlpha;

float easeInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
  float seed = aMeta.y;
  float t1 = easeInOut(clamp((uStage - seed * 0.3) / 0.7, 0.0, 1.0));
  float t2 = easeInOut(clamp((uStage - 1.0 - seed * 0.3) / 0.7, 0.0, 1.0));
  vec3 position = mix(mix(aPos0, aPos1, t1), aPos2, t2);
  vec3 color = mix(mix(aCol0, aCol1, t1), aCol2, t2);

  // Particles lift off mid-morph, then settle into the next shape.
  vec3 drift = vec3(fract(seed * 91.7), fract(seed * 47.3), fract(seed * 13.1)) - 0.5;
  float lift = sin(t1 * 3.14159) + sin(t2 * 3.14159);
  position += drift * lift * 1.1;

  // Assembly on load: from a wide scatter into the molecule.
  float intro = 1.0 - pow(1.0 - uIntro, 3.0);
  position = mix(position * 2.6 + drift * 5.0, position, intro);

  // Slow shimmer so the cloud never looks frozen.
  position += vec3(sin(uTime * 0.6 + seed * 40.0), cos(uTime * 0.5 + seed * 30.0), sin(uTime * 0.4 + seed * 20.0)) * 0.012;

  vec4 world = uModel * vec4(position, 1.0);
  vec2 away = world.xy - uPointer;
  float push = uPointerStrength * smoothstep(1.15, 0.0, length(away));
  world.xy += normalize(away + 0.0001) * push * 0.42;

  gl_Position = uViewProj * world;
  gl_PointSize = uPointSize * aMeta.x / gl_Position.w;
  vColor = color * (0.62 + push * 0.6);
  vAlpha = intro * (0.5 + 0.5 * aMeta.x);
}
`;

const FRAGMENT = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

type Mat4 = Float32Array<ArrayBuffer>;

function perspective(fovY: number, aspect: number, near: number, far: number, shiftX: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[8] = -shiftX; // lens shift: moves the scene's centre sideways in clip space
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function model(yaw: number, pitch: number, scale: number): Mat4 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Ry(yaw) · Rx(pitch) · S(scale), column-major.
  return new Float32Array([
    cy * scale, 0, -sy * scale, 0,
    sy * sp * scale, cp * scale, cy * sp * scale, 0,
    sy * cp * scale, -sp * scale, cy * cp * scale, 0,
    0, 0, 0, 1,
  ]);
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

export function startEvidenceScene(options: EvidenceSceneOptions): () => void {
  const { canvas, section, steps, labels, topicCounts, onFail } = options;
  const gl = (canvas.getContext('webgl2', { antialias: false, alpha: true, powerPreference: 'high-performance' }) ??
    canvas.getContext('webgl', { antialias: false, alpha: true })) as WebGLRenderingContext | null;
  if (!gl) {
    onFail();
    return () => undefined;
  }

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    onFail();
    return () => undefined;
  }
  gl.useProgram(program);

  const count = canvas.clientWidth >= 1200 ? 7200 : 5200;
  const particles = buildParticles(count, topicCounts);
  const attribute = (name: string, data: Float32Array, size: number) => {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
  particles.positions.forEach((data, index) => attribute(`aPos${index}`, data, 3));
  particles.colors.forEach((data, index) => attribute(`aCol${index}`, data, 3));
  attribute('aMeta', particles.meta, 2);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    model: uniform('uModel'),
    viewProj: uniform('uViewProj'),
    stage: uniform('uStage'),
    time: uniform('uTime'),
    intro: uniform('uIntro'),
    pointer: uniform('uPointer'),
    pointerStrength: uniform('uPointerStrength'),
    pointSize: uniform('uPointSize'),
  };

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light on the navy ground
  gl.clearColor(0, 0, 0, 0);

  const FOV = (34 * Math.PI) / 180;
  const CAMERA_Z = 9.5;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let viewProj = new Float32Array(16);
  let projection = new Float32Array(16);

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = width / Math.max(height, 1);
    // Wide screens: the scene sits right of the text column.
    const shift = width >= 1024 ? 0.47 : 0.36;
    projection = perspective(FOV, aspect, 0.1, 60, shift);
    const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -CAMERA_Z, 1]);
    viewProj = multiply(projection, view);
    gl.uniformMatrix4fv(u.viewProj, false, viewProj);
    gl.uniform1f(u.pointSize, height * dpr * 0.034);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  // Pointer, in world units on the z = 0 plane.
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, inside: false };
  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((event.clientY - rect.top) / rect.height) * 2;
    pointer.nx = ndcX;
    pointer.ny = ndcY;
    pointer.x = ((ndcX + projection[8]) * CAMERA_Z) / projection[0];
    pointer.y = (ndcY * CAMERA_Z) / projection[5];
    pointer.inside = true;
  };
  const onPointerLeave = () => {
    pointer.inside = false;
  };
  section.addEventListener('pointermove', onPointerMove, { passive: true });
  section.addEventListener('pointerleave', onPointerLeave, { passive: true });

  let running = true;
  let visible = true;
  let frame = 0;
  let last = performance.now();
  const start = last;
  let stage = 0;
  let yaw = 0.5;
  let pitch = 0;
  let strength = 0;
  let activeStep = '';

  const stageFromScroll = () => {
    const viewport = window.innerHeight;
    const progress = (element: HTMLElement | undefined) => {
      if (!element) return 0;
      const top = element.getBoundingClientRect().top;
      return clamp((viewport * 0.82 - top) / (viewport * 0.5), 0, 1);
    };
    return progress(steps[1]) + progress(steps[2]);
  };

  const placeLabels = (modelMatrix: Mat4) => {
    const opacity = clamp((stage - 1.55) / 0.4, 0, 1);
    if (opacity === 0) {
      for (const label of labels) label.style.opacity = '0';
      return;
    }
    const mvp = multiply(viewProj, modelMatrix);
    particles.labels.forEach((position, index) => {
      const label = labels[index];
      if (!label) return;
      const [x, y, z] = position;
      const clipX = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
      const clipY = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
      const clipW = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
      const sx = ((clipX / clipW + 1) / 2) * width;
      const sy = ((1 - clipY / clipW) / 2) * height;
      // Labels on the far side of the network recede, which also keeps them from crowding the near ones.
      const depth = clamp((CAMERA_Z + 1.6 - clipW) / 3.2, 0.25, 1);
      label.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      label.style.opacity = (opacity * depth).toFixed(3);
      label.style.zIndex = String(Math.round(depth * 100));
      const side = sx > width - 190 ? 'left' : 'right';
      if (label.dataset.side !== side) label.dataset.side = side;
    });
  };

  const render = (now: number) => {
    frame = 0;
    if (!running || !visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = (now - start) / 1000;

    stage = damp(stage, stageFromScroll(), 4.5, dt);
    const step = stage < 0.5 ? '1' : stage < 1.5 ? '2' : '3';
    if (step !== activeStep) {
      activeStep = step;
      section.dataset.step = step;
    }

    // Rotate freely as a molecule or network; face the viewer while the plot is shown.
    const facing = clamp(1 - Math.abs(stage - 1) * 1.6, 0, 1);
    yaw += dt * 0.16 * (1 - facing);
    if (facing > 0) {
      const target = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2;
      yaw = damp(yaw, target, 3 * facing, dt);
    }
    const tiltX = pointer.inside ? pointer.ny * 0.12 : 0;
    const tiltY = pointer.inside ? pointer.nx * 0.18 : 0;
    pitch = damp(pitch, tiltX * (1 - facing * 0.6) + (stage > 1.5 ? 0.22 : 0), 2.5, dt);
    strength = damp(strength, pointer.inside ? 1 : 0, 4, dt);

    // Each shape at the size that keeps it clear of the text column.
    const toTrial = clamp(stage, 0, 1);
    const toEvidence = clamp(stage - 1, 0, 1);
    const fit = width >= 1024 ? 1 : 0.85;
    const scale = (0.84 + (0.76 - 0.84) * toTrial + (0.9 - 0.76) * toEvidence) * fit;
    const modelMatrix = model(yaw + tiltY * (1 - facing), pitch, scale);
    gl.uniformMatrix4fv(u.model, false, modelMatrix);
    gl.uniform1f(u.stage, stage);
    gl.uniform1f(u.time, time);
    gl.uniform1f(u.intro, clamp((now - start) / 1900, 0, 1));
    gl.uniform2f(u.pointer, pointer.x, pointer.y);
    gl.uniform1f(u.pointerStrength, strength);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, particles.count);
    placeLabels(modelMatrix);
    frame = requestAnimationFrame(render);
  };

  const resume = () => {
    if (!frame && running && visible) {
      last = performance.now();
      frame = requestAnimationFrame(render);
    }
  };

  // Stop drawing while the story is off screen or the tab is hidden.
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
  });
  intersection.observe(section);
  const onVisibility = () => {
    running = document.visibilityState === 'visible';
    if (running) resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    running = false;
    onFail();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  resume();

  return () => {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    section.removeEventListener('pointermove', onPointerMove);
    section.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
