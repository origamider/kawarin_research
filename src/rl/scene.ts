// 黒地に発光線のワイヤーフレーム・ボクセルで描く Three.js シーン。シミュレータの状態を読むだけ。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { N_RAYS, type Sim } from './sim';

const BG = 0x020604;

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class FieldScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  controls: OrbitControls;
  private world = new THREE.Group();
  private orbs: THREE.Object3D[] = [];
  private agent = new THREE.Group();
  private rays: THREE.LineSegments;
  private trail: THREE.Line;
  private trailPts: THREE.Vector3[] = [];
  private sim!: Sim;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(BG, 0);
    host.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(BG, 0.018);
    this.scene.add(this.world, this.agent);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.4;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.enablePan = false;

    this.rays = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(N_RAYS * 6).fill(0), 3)),
      new THREE.LineBasicMaterial({ color: 0x7fd8a0, transparent: true, opacity: 0.25 }),
    );
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xc9a25a, transparent: true, opacity: 0.6 }));
    this.scene.add(this.rays, this.trail);
    this.buildAgent();
    new ResizeObserver(() => this.resize()).observe(host);
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private buildAgent() {
    // 小さなボクセル生物: 胴体 + 目 2 つ
    const mk = (s: number, color: number, x: number, y: number, z: number) => {
      const g = new THREE.BoxGeometry(s, s, s).translate(x, y, z);
      this.agent.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: BG })));
      this.agent.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color })));
    };
    mk(0.55, 0xe0a84a, 0, 0.32, 0);
    mk(0.12, 0xf2e6c8, 0.3, 0.42, -0.12);
    mk(0.12, 0xf2e6c8, 0.3, 0.42, 0.12);
  }

  setField(sim: Sim) {
    this.sim = sim;
    this.world.clear();
    this.orbs = [];
    this.trailPts = [];
    const hue = (sim.field.hue ?? 140) / 360;
    const col = (l: number, s = 0.45, dh = 0) => new THREE.Color().setHSL(hue + dh, s, l);
    const pos: number[] = [], colors: number[] = [];
    const fill: THREE.Matrix4[] = [];
    const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.96, 0.96));
    const bp = box.getAttribute('position');
    const addCube = (x: number, y: number, z: number, c: THREE.Color) => {
      for (let i = 0; i < bp.count; i++) {
        pos.push(bp.getX(i) + x, bp.getY(i) + y, bp.getZ(i) + z);
        colors.push(c.r, c.g, c.b);
      }
      fill.push(new THREE.Matrix4().makeTranslation(x, y, z));
    };
    const addTile = (x: number, z: number, y: number, c: THREE.Color) => {
      const q = [[-.48, -.48], [.48, -.48], [.48, .48], [-.48, .48]];
      for (let i = 0; i < 4; i++) {
        const [a, b] = q[i], [d, e] = q[(i + 1) % 4];
        pos.push(x + a, y, z + b, x + d, y, z + e);
        colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    };
    const ox = sim.w / 2, oz = sim.h / 2;
    sim.grid.forEach((row, gy) => row.forEach((c, gx) => {
      const x = gx + 0.5 - ox, z = gy + 0.5 - oz;
      const v = hash(gx, gy);
      if (c === '#') {
        const outer = gx === 0 || gy === 0 || gx === sim.w - 1 || gy === sim.h - 1;
        const hgt = outer ? 1 : 1 + Math.floor(v * 3);
        for (let k = 0; k < hgt; k++) addCube(x, k + 0.48, z, col(0.42 + k * 0.07 + v * 0.06, 0.55));
      } else if (c === '^') {
        addTile(x, z, 0, col(0.45, 0.5, -0.38)); // 赤寄り
      } else if (c === '~') {
        addTile(x, z, -0.15, col(0.4, 0.45, 0.25)); // 青寄り
      } else {
        addTile(x, z, 0, col(0.26 + v * 0.08, 0.5));
      }
    }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.world.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true })));
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.94, 0.94, 0.94),
      new THREE.MeshBasicMaterial({ color: BG, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }), fill.length);
    fill.forEach((m, i) => inst.setMatrixAt(i, m));
    this.world.add(inst);

    for (const o of sim.orbs) {
      const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.22)), new THREE.LineBasicMaterial({ color: 0xe8c66a }));
      m.position.set(o.x - ox, 0.5, o.y - oz);
      this.world.add(m);
      this.orbs.push(m);
    }
    this.camera.position.set(0, Math.max(sim.w, sim.h) * 0.5, Math.max(sim.w, sim.h) * 0.6);
    this.controls.target.set(0, 0, 0);
  }

  render(time: number) {
    const s = this.sim, ox = s.w / 2, oz = s.h / 2;
    this.orbs.forEach((m, k) => {
      m.visible = !s.got[k];
      m.rotation.y = time * 0.0015 + k;
      m.position.y = 0.5 + Math.sin(time * 0.003 + k) * 0.08;
    });
    this.agent.position.set(s.x - ox, Math.abs(Math.sin(time * 0.012)) * 0.08 * (s.speed > 0.2 ? 1 : 0), s.y - oz);
    this.agent.rotation.y = -s.heading;

    const rp = this.rays.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < N_RAYS; i++) {
      const a = s.rayAngle(i), d = s.ray(a);
      rp.setXYZ(i * 2, s.x - ox, 0.3, s.y - oz);
      rp.setXYZ(i * 2 + 1, s.x - ox + Math.cos(a) * d, 0.3, s.y - oz + Math.sin(a) * d);
    }
    rp.needsUpdate = true;

    if (s.t <= 1) this.trailPts = [];
    this.trailPts.push(new THREE.Vector3(s.x - ox, 0.05, s.y - oz));
    if (this.trailPts.length > 120) this.trailPts.shift();
    this.trail.geometry.setFromPoints(this.trailPts);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

/** 背景のコードの雨（2D canvas）。明るすぎないよう低い不透明度で */
export function codeRain(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const chars = 'アイウエオカキクケコサシスセソ01λθπ∇∑{}<>=;';
  let cols: number[] = [];
  const fs = 14;
  const resize = () => {
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    cols = Array.from({ length: Math.ceil(canvas.width / fs) }, () => Math.random() * -50);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  return () => {
    ctx.fillStyle = 'rgba(2, 6, 4, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fs}px monospace`;
    cols.forEach((y, i) => {
      ctx.fillStyle = Math.random() < 0.03 ? 'rgba(170, 230, 180, 0.5)' : 'rgba(70, 170, 100, 0.5)';
      ctx.fillText(chars[(Math.random() * chars.length) | 0], i * fs, y * fs);
      cols[i] = y * fs > canvas.height && Math.random() > 0.975 ? 0 : y + 0.5;
    });
  };
}
