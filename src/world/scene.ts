// 観賞用の 3D 世界。ボクセルの浮島 + 時刻と気分で色が変わるダークエメラルドの太陽 + 光と影。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { generate, SIZE, type Kind, type TerrainParams, type Voxel } from './terrain';

// glow: 枠線の光り方。地面は控えめにして、結晶と欠片だけはっきり光らせる
const KINDS: Record<Kind, { edge: number; body: number; glow: number }> = {
  ground: { edge: 0x2fbf71, body: 0x123a24, glow: 0.22 },
  peak: { edge: 0xa6d94a, body: 0x25381a, glow: 0.3 },
  rock: { edge: 0x1c5a3c, body: 0x07140e, glow: 0.12 },
  water: { edge: 0x2a9fd0, body: 0x04121c, glow: 0.5 },
  crystal: { edge: 0x6dffc8, body: 0x0c3a2a, glow: 1.6 },
  shard: { edge: 0x3fe0a0, body: 0x061a12, glow: 0.9 },
};
const CAP = 14000;

/** 太陽の気分。bright = 明るさ, vivid = 鮮やかさ（どちらも 0..1） */
export type Mood = { bright: number; vivid: number };

/** 1マスの面に枠線だけ光るテクスチャ */
function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// 太陽の高度に応じた空の色 [天頂, 地平]
const SKY: [number, string, string][] = [
  [-0.3, '#010403', '#020a07'],
  [0.0, '#05140f', '#163a2a'],
  [0.25, '#041a18', '#0f3f34'],
  [1.0, '#05221f', '#0e4a3c'],
];
function skyAt(alt: number) {
  let i = 0;
  while (i < SKY.length - 2 && alt > SKY[i + 1][0]) i++;
  const [a0, t0, h0] = SKY[i], [a1, t1, h1] = SKY[i + 1];
  const k = Math.min(1, Math.max(0, (alt - a0) / (a1 - a0)));
  return [new THREE.Color(t0).lerp(new THREE.Color(t1), k), new THREE.Color(h0).lerp(new THREE.Color(h1), k)];
}

type Anim = { v: Voxel; delay: number };

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  private composer: EffectComposer;
  private meshes = new Map<Kind, THREE.InstancedMesh>();
  private anims = new Map<Kind, Anim[]>();
  private buildStart = 0;
  private settled = true;
  private sun: THREE.Mesh;
  private halo: THREE.Sprite;
  private light: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private skyMat: THREE.ShaderMaterial;
  private dust: THREE.Points;
  private controls: OrbitControls;
  private m = new THREE.Matrix4();
  /** null なら時間帯で自動 */
  mood: Mood | null = null;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(this.renderer.domElement);

    // 空（グラデーションの内側球）
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 p; void main(){ float k = pow(clamp(p.y,0.,1.),0.6); gl_FragColor = vec4(mix(horizon, top, k), 1.); }',
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), this.skyMat));
    this.scene.fog = new THREE.Fog(0x000000, 60, 170);

    // 太陽: ダークエメラルドの球 + 光の輪（色は render で気分から決める）
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), new THREE.MeshBasicMaterial({ fog: false }));
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    this.halo.scale.setScalar(55);
    this.scene.add(this.sun, this.halo);

    this.light = new THREE.DirectionalLight(0x9effd8, 2);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    Object.assign(this.light.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 });
    this.light.shadow.bias = -0.001;
    this.hemi = new THREE.HemisphereLight(0x3fa0a0, 0x02100a, 0.5);
    this.scene.add(this.light, this.light.target, this.hemi);

    // 浮遊する光の粒（奥行き）
    const pts = new Float32Array(900 * 3).map((_, i) => (i % 3 === 1 ? Math.random() * 40 : (Math.random() - 0.5) * 120));
    this.dust = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3)),
      new THREE.PointsMaterial({ color: 0x7dffc0, size: 0.25, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.scene.add(this.dust);

    const tex = gridTexture();
    for (const [kind, c] of Object.entries(KINDS) as [Kind, (typeof KINDS)[Kind]][]) {
      const mat = new THREE.MeshLambertMaterial({ color: c.body, emissive: c.edge, emissiveMap: tex, emissiveIntensity: c.glow, transparent: kind === 'water', opacity: kind === 'water' ? 0.8 : 1 });
      const geo = kind === 'crystal' ? new THREE.BoxGeometry(0.5, 1, 0.5) : new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.InstancedMesh(geo, mat, CAP);
      mesh.count = 0;
      mesh.castShadow = kind !== 'water';
      mesh.receiveShadow = true;
      this.meshes.set(kind, mesh);
      this.scene.add(mesh);
    }

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.6, 0.7));
    this.composer.addPass(new OutputPass());

    // カーソルで回す・寄る。触らなければゆっくり自転
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, autoRotate: true, autoRotateSpeed: 0.35, enablePan: false, minDistance: 22, maxDistance: 95, maxPolarAngle: Math.PI * 0.72 });
    this.controls.target.set(0, 2, 0);
    this.camera.position.set(0, 20, 50);

    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** 新しい地形を中心から外へ「せり上がる」ように生成する */
  build(p: TerrainParams, extraCrystals: number) {
    const { voxels } = generate(p, extraCrystals);
    for (const k of this.meshes.keys()) this.anims.set(k, []);
    const c = SIZE / 2;
    for (const v of voxels) {
      const delay = Math.hypot(v.x - c, v.z - c) * 0.05 + Math.abs(v.y) * 0.04;
      this.anims.get(v.kind)!.push({ v, delay });
    }
    for (const [k, mesh] of this.meshes) mesh.count = Math.min(this.anims.get(k)!.length, CAP);
    this.buildStart = performance.now();
    this.settled = false;
  }

  private placeVoxels(now: number) {
    if (this.settled) return; // アニメーション終了後は動かさない
    const t = (now - this.buildStart) / 1000;
    if (t > 4) this.settled = true; // 最後に一度だけ確定位置に置く（フレームが飛んでも崩れない）
    const c = SIZE / 2;
    for (const [k, mesh] of this.meshes) {
      const list = this.anims.get(k)!;
      for (let i = 0; i < mesh.count; i++) {
        const { v, delay } = list[i];
        const s = Math.min(1, Math.max(0, (t - delay) / 0.5));
        const e = 1 - (1 - s) ** 3;
        this.m.makeScale(e || 1e-4, e || 1e-4, e || 1e-4).setPosition(v.x - c + 0.5, v.y + 0.5 - (1 - e) * 2, v.z - c + 0.5);
        mesh.setMatrixAt(i, this.m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** dayFrac: 0..1 の時刻（0.25 = 6時, 0.5 = 正午） */
  render(now: number, dayFrac: number) {
    this.placeVoxels(now);
    const ang = (dayFrac - 0.25) * Math.PI * 2; // 6時に東の地平, 正午に頂点
    const alt = Math.sin(ang);
    // 夜も沈みきらず、地平線のすぐ上で暗く残る
    const sunPos = new THREE.Vector3(Math.cos(ang) * 110, 8 + Math.max(alt, 0.04) * 80, -120);
    this.sun.position.copy(sunPos);
    this.halo.position.copy(sunPos);
    // 気分（未指定なら時間帯）→ 太陽の色。昼は明るく鮮やか、朝夕は沈んだ深緑
    const day = Math.max(0, alt);
    const mood = this.mood ?? { bright: 0.12 + day * 0.65, vivid: 0.4 + day * 0.45 };
    const core = new THREE.Color().setHSL(0.43, mood.vivid, 0.06 + mood.bright * 0.26);
    (this.sun.material as THREE.MeshBasicMaterial).color.copy(core).multiplyScalar(1 + mood.bright * 1.1);
    this.halo.material.color.setHSL(0.44, mood.vivid, 0.15 + mood.bright * 0.35);
    this.halo.scale.setScalar(35 + mood.bright * 40);
    this.light.color.setHSL(0.42, mood.vivid * 0.7, 0.55 + mood.bright * 0.2);
    this.light.position.copy(sunPos).multiplyScalar(0.4);
    this.light.intensity = day * (1 + mood.bright * 2);
    this.hemi.intensity = 0.25 + Math.max(0, alt) * 0.5;
    const [top, hor] = skyAt(alt);
    this.skyMat.uniforms.top.value.copy(top);
    this.skyMat.uniforms.horizon.value.copy(hor);
    (this.scene.fog as THREE.Fog).color.copy(hor);

    const pos = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, (pos.getY(i) + 0.01) % 40);
    pos.needsUpdate = true;

    this.controls.update();
    this.composer.render();
  }
}
