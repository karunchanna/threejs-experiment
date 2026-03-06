/**
 * SparkJS World Renderer
 *
 * Renders Marble world assets (SPZ gaussian splat files) in the browser
 * using SparkJS (https://sparkjs.dev), the recommended web renderer for
 * World Labs content.
 *
 * SparkJS integration:
 * - SplatMesh extends THREE.Object3D → loads .spz files directly
 * - SparkRenderer auto-creates in scene, handles back-to-front sorting
 * - Supports .spz (World Labs format), .ply, .splat, .sogs, .ksplat
 *
 * Fallback:
 * When SPZ assets aren't available (mock mode), builds a spectacular
 * procedural world that represents the target visual quality.
 *
 * Package: @sparkjsdev/spark (npm)
 * CDN: https://sparkjs.dev/releases/spark/0.1.10/spark.module.js
 */

import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import type { MarbleWorldAsset } from '../worldlabs/types';

export interface SparkJSConfig {
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export class SparkJSWorldRenderer {
  private scene: THREE.Scene;
  private worldGroup: THREE.Group;
  private splatMesh: SplatMesh | null = null;
  private isLoaded = false;
  private usesSplat = false;

  constructor(private config: SparkJSConfig) {
    this.scene = config.scene;
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'marble-world';
    this.scene.add(this.worldGroup);
  }

  /**
   * Load and render a Marble world asset.
   *
   * Real path: Dynamically imports @sparkjsdev/spark, creates a SplatMesh
   * pointed at the SPZ URL, adds it to the Three.js scene.
   *
   * Fallback path: Builds a procedural world with Three.js geometries
   * and splat-inspired particles.
   */
  async loadWorld(
    asset: MarbleWorldAsset,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (!asset.isMock) {
      try {
        await this.loadSparkJSSplatWorld(asset, onProgress);
        this.usesSplat = true;
        this.isLoaded = true;
        return;
      } catch (e) {
        console.warn('SparkJS splat load failed, using procedural fallback:', e);
      }
    }

    // Procedural fallback world
    await this.buildProceduralWorld(onProgress);
    this.isLoaded = true;
  }

  /**
   * Real SparkJS integration path.
   *
   * SplatMesh extends SplatGenerator extends THREE.Object3D, so it works
   * like any Three.js object in the scene graph.
   *
   * SparkRenderer is automatically created when the first SplatMesh is
   * added to a scene. It manages GPU-based gaussian splat sorting.
   *
   * Supported formats: .spz (World Labs), .ply, .splat, .sogs, .ksplat
   */
  private async loadSparkJSSplatWorld(
    asset: MarbleWorldAsset,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    onProgress?.(0.1);

    // Ensure SparkJS static initialization is complete
    await SplatMesh.staticInitialize();

    onProgress?.(0.2);

    // Create SplatMesh with the SPZ URL from Marble API
    // SplatMesh will fetch the SPZ file, decode gaussian splats,
    // and render them using the SparkRenderer's sort pipeline.
    const splat = new SplatMesh({
      url: asset.spzUrl,
      onLoad: async () => {
        onProgress?.(0.7);
        console.log('[SparkJS] Splat world loaded:', {
          boundingBox: splat.getBoundingBox(),
        });
      },
    });

    // Wait for the splat to finish loading
    await splat.initialized;

    // SplatMesh extends Object3D — position/rotate like any Three.js object
    splat.position.set(0, 0, 0);

    this.splatMesh = splat;
    this.scene.add(splat);

    onProgress?.(0.8);

    // Optionally load collider mesh for physics/interaction
    if (asset.colliderUrl) {
      await this.loadColliderMesh(asset.colliderUrl);
    }

    // Add gameplay overlay elements (beacons need Three.js meshes on top of splat world)
    this.addWorldOverlays();

    onProgress?.(1.0);
  }

  /** Load the GLB collider mesh for approximate collision detection */
  private async loadColliderMesh(url: string): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      const collider = gltf.scene;
      collider.name = 'collider-mesh';
      collider.visible = false; // Invisible — used only for raycasting
      this.worldGroup.add(collider);
    } catch (e) {
      console.warn('Failed to load collider mesh:', e);
    }
  }

  /** Add Three.js overlay elements that complement the splat world */
  private addWorldOverlays(): void {
    // Environmental particles floating above the splat world
    this.buildSplatParticles();

    // Subtle fog layers
    for (let layer = 0; layer < 3; layer++) {
      const y = -5 + layer * 10;
      const fogGeo = new THREE.PlaneGeometry(200, 200);
      const fogMat = new THREE.MeshBasicMaterial({
        color: 0x0a1428,
        transparent: true,
        opacity: 0.02,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fog = new THREE.Mesh(fogGeo, fogMat);
      fog.rotation.x = -Math.PI / 2;
      fog.position.y = y;
      this.worldGroup.add(fog);
    }
  }

  /** Build the procedural fallback world */
  private async buildProceduralWorld(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    onProgress?.(0.1);
    this.buildTerrain();

    onProgress?.(0.3);
    this.buildCanyonWalls();

    onProgress?.(0.5);
    this.buildRuins();

    onProgress?.(0.6);
    this.buildFloatingPathways();

    onProgress?.(0.7);
    this.buildBioluminescence();

    onProgress?.(0.8);
    this.buildAtmosphere();

    onProgress?.(0.9);
    this.buildSplatParticles();

    onProgress?.(1.0);
  }

  private buildTerrain(): void {
    const floorGeo = new THREE.PlaneGeometry(400, 400, 128, 128);
    const positions = floorGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      let y = 0;
      y += Math.sin(x * 0.015) * 8;
      y += Math.cos(z * 0.02) * 6;
      y += Math.sin(x * 0.05 + z * 0.03) * 3;
      y += (Math.random() - 0.5) * 1.5;
      const distFromCenter = Math.sqrt(x * x + z * z);
      y -= Math.max(0, 20 - distFromCenter * 0.15);
      positions.setZ(i, y);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.worldGroup.add(floor);

    const waterGeo = new THREE.PlaneGeometry(120, 120);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a2a5a,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.7,
      emissive: 0x041838,
      emissiveIntensity: 0.3,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -12;
    this.worldGroup.add(water);
  }

  private buildCanyonWalls(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e3a,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const radius = 80 + Math.sin(angle * 3) * 30 + Math.random() * 20;
      const height = 30 + Math.random() * 50;
      const width = 8 + Math.random() * 15;
      const depth = 8 + Math.random() * 15;

      const geo = new THREE.BoxGeometry(width, height, depth, 2, 4, 2);
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setX(j, pos.getX(j) + (Math.random() - 0.5) * 3);
        pos.setZ(j, pos.getZ(j) + (Math.random() - 0.5) * 3);
      }
      geo.computeVertexNormals();

      const wall = new THREE.Mesh(geo, wallMat.clone());
      wall.position.set(
        Math.cos(angle) * radius,
        height * 0.3 - 5,
        Math.sin(angle) * radius
      );
      wall.rotation.y = angle + Math.random() * 0.5;
      wall.castShadow = true;
      this.worldGroup.add(wall);
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 50;
      const height = 20 + Math.random() * 40;

      const geo = new THREE.CylinderGeometry(
        2 + Math.random() * 4,
        3 + Math.random() * 5,
        height,
        6 + Math.floor(Math.random() * 4)
      );
      const pillar = new THREE.Mesh(geo, wallMat.clone());
      pillar.position.set(
        Math.cos(angle) * radius,
        height * 0.4,
        Math.sin(angle) * radius
      );
      pillar.castShadow = true;
      this.worldGroup.add(pillar);
    }
  }

  private buildRuins(): void {
    const ruinMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a4a,
      roughness: 0.7,
      metalness: 0.2,
      emissive: 0x0a0a2a,
      emissiveIntensity: 0.1,
    });

    const monumentGeo = new THREE.CylinderGeometry(8, 10, 25, 8);
    const monument = new THREE.Mesh(monumentGeo, ruinMat.clone());
    monument.position.set(0, 12.5, 0);
    monument.name = 'central-monument';
    this.worldGroup.add(monument);

    const ringGeo = new THREE.TorusGeometry(6, 0.8, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a6a,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0x1a1a4a,
      emissiveIntensity: 0.2,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 26, 0);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'monument-ring';
    this.worldGroup.add(ring);

    const ruinPositions = [
      [-25, 0, -30], [30, 0, -20], [-15, 0, 35],
      [40, 0, 25], [-35, 0, 10], [20, 0, -40],
      [-40, 0, -15], [10, 0, 45], [45, 0, -10],
    ];

    for (const [rx, , rz] of ruinPositions) {
      const blockCount = 2 + Math.floor(Math.random() * 4);
      for (let j = 0; j < blockCount; j++) {
        const w = 2 + Math.random() * 5;
        const h = 3 + Math.random() * 8;
        const d = 2 + Math.random() * 5;
        const geo = new THREE.BoxGeometry(w, h, d);
        const block = new THREE.Mesh(geo, ruinMat.clone());
        block.position.set(
          rx + (Math.random() - 0.5) * 8,
          h * 0.5,
          rz + (Math.random() - 0.5) * 8
        );
        block.rotation.set(
          (Math.random() - 0.5) * 0.3,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.2
        );
        block.castShadow = true;
        this.worldGroup.add(block);
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      const radius = 35 + Math.random() * 15;
      this.buildArch(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
        angle + Math.PI / 2,
        8 + Math.random() * 6
      );
    }
  }

  private buildArch(x: number, y: number, z: number, rotation: number, height: number): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2e2e50,
      roughness: 0.7,
      metalness: 0.15,
    });

    const spacing = 4;
    const lGeo = new THREE.BoxGeometry(1.5, height, 1.5);
    const left = new THREE.Mesh(lGeo, mat);
    left.position.set(x - Math.cos(rotation) * spacing, y + height / 2, z - Math.sin(rotation) * spacing);
    this.worldGroup.add(left);

    const right = new THREE.Mesh(lGeo.clone(), mat.clone());
    right.position.set(x + Math.cos(rotation) * spacing, y + height / 2, z + Math.sin(rotation) * spacing);
    this.worldGroup.add(right);

    const tGeo = new THREE.BoxGeometry(spacing * 2 + 2, 1.2, 1.8);
    const top = new THREE.Mesh(tGeo, mat.clone());
    top.position.set(x, y + height, z);
    top.rotation.y = rotation;
    this.worldGroup.add(top);
  }

  private buildFloatingPathways(): void {
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x252545,
      roughness: 0.6,
      metalness: 0.3,
      emissive: 0x101030,
      emissiveIntensity: 0.15,
    });

    const pathPoints: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const spiralR = 15 + t * 35;
      const angle = t * Math.PI * 3;
      const x = Math.cos(angle) * spiralR;
      const z = Math.sin(angle) * spiralR;
      const y = 5 + Math.sin(t * Math.PI * 4) * 8 + t * 10;
      pathPoints.push([x, y, z]);
    }

    for (const [px, py, pz] of pathPoints) {
      const w = 3 + Math.random() * 2;
      const geo = new THREE.BoxGeometry(w, 0.6, w);
      const slab = new THREE.Mesh(geo, pathMat.clone());
      slab.position.set(px, py, pz);
      slab.rotation.y = Math.random() * Math.PI;
      slab.rotation.x = (Math.random() - 0.5) * 0.1;
      slab.rotation.z = (Math.random() - 0.5) * 0.1;
      slab.castShadow = true;
      slab.receiveShadow = true;
      this.worldGroup.add(slab);
    }

    const platforms = [
      { pos: [0, 30, 0], size: 12 },
      { pos: [-50, 20, -30], size: 8 },
      { pos: [40, 25, 35], size: 10 },
      { pos: [-30, 35, 40], size: 7 },
      { pos: [55, 15, -20], size: 9 },
    ];

    for (const p of platforms) {
      const geo = new THREE.CylinderGeometry(p.size, p.size * 1.1, 2, 8);
      const platform = new THREE.Mesh(geo, pathMat.clone());
      platform.position.set(p.pos[0], p.pos[1], p.pos[2]);
      platform.castShadow = true;
      platform.receiveShadow = true;
      this.worldGroup.add(platform);
    }
  }

  private buildBioluminescence(): void {
    const glowColors = [0x00ffaa, 0x00aaff, 0x8844ff, 0x00ff88, 0x4488ff];

    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 80;
      const color = glowColors[Math.floor(Math.random() * glowColors.length)];

      const height = 0.5 + Math.random() * 3;
      const geo = new THREE.ConeGeometry(0.2 + Math.random() * 0.5, height, 5);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8 + Math.random() * 0.5,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
      });

      const crystal = new THREE.Mesh(geo, mat);
      crystal.position.set(
        Math.cos(angle) * radius,
        Math.random() * 2,
        Math.sin(angle) * radius
      );
      crystal.rotation.x = (Math.random() - 0.5) * 0.4;
      crystal.rotation.z = (Math.random() - 0.5) * 0.4;
      this.worldGroup.add(crystal);

      if (Math.random() < 0.15) {
        const light = new THREE.PointLight(color, 2, 15);
        light.position.copy(crystal.position);
        light.position.y += height;
        this.worldGroup.add(light);
      }
    }

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 70;
      const length = 2 + Math.random() * 8;

      const geo = new THREE.PlaneGeometry(0.3, length);
      const color = glowColors[Math.floor(Math.random() * glowColors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.4,
        side: THREE.DoubleSide,
      });

      const vein = new THREE.Mesh(geo, mat);
      vein.position.set(
        Math.cos(angle) * radius,
        0.15,
        Math.sin(angle) * radius
      );
      vein.rotation.x = -Math.PI / 2;
      vein.rotation.z = Math.random() * Math.PI;
      this.worldGroup.add(vein);
    }
  }

  private buildAtmosphere(): void {
    for (let layer = 0; layer < 5; layer++) {
      const y = -5 + layer * 8;
      const fogGeo = new THREE.PlaneGeometry(300, 300);
      const fogMat = new THREE.MeshBasicMaterial({
        color: 0x0a1428,
        transparent: true,
        opacity: 0.03 + layer * 0.01,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fog = new THREE.Mesh(fogGeo, fogMat);
      fog.rotation.x = -Math.PI / 2;
      fog.position.y = y;
      this.worldGroup.add(fog);
    }

    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const radius = 150 + Math.random() * 50;
      const height = 50 + Math.random() * 80;

      const geo = new THREE.ConeGeometry(15 + Math.random() * 20, height, 5);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0a0a1e,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      });
      const mountain = new THREE.Mesh(geo, mat);
      mountain.position.set(
        Math.cos(angle) * radius,
        height * 0.3,
        Math.sin(angle) * radius
      );
      this.worldGroup.add(mountain);
    }
  }

  private buildSplatParticles(): void {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color(0x00ffaa),
      new THREE.Color(0x0088ff),
      new THREE.Color(0x6633ff),
      new THREE.Color(0x00ff66),
      new THREE.Color(0x0044aa),
      new THREE.Color(0x1a1a3e),
      new THREE.Color(0x2a2a5e),
    ];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 120;
      const y = -10 + Math.random() * 60;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.5 + Math.random() * 3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geo, mat);
    particles.name = 'splat-particles';
    this.worldGroup.add(particles);
  }

  /** Update animated elements each frame */
  update(time: number): void {
    if (!this.isLoaded) return;

    // Animate splat particles
    const particles = this.worldGroup.getObjectByName('splat-particles') as THREE.Points | undefined;
    if (particles) {
      const positions = particles.geometry.attributes.position;
      for (let i = 0; i < Math.min(positions.count, 2000); i++) {
        const y = positions.getY(i);
        positions.setY(i, y + Math.sin(time * 0.5 + i * 0.1) * 0.003);
      }
      positions.needsUpdate = true;
      particles.rotation.y = time * 0.01;
    }

    // Animate monument ring (procedural world only)
    if (!this.usesSplat) {
      const ring = this.worldGroup.getObjectByName('monument-ring') as THREE.Mesh | undefined;
      if (ring) {
        ring.rotation.z = time * 0.2;
        const mat = ring.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.2 + Math.sin(time) * 0.1;
      }
    }
  }

  getWorldGroup(): THREE.Group {
    return this.worldGroup;
  }

  /** Trigger visual transformation on the world (for final beacon activation) */
  triggerWorldTransformation(intensity: number): void {
    // Brighten emissive materials in the procedural world
    this.worldGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        if (obj.material.emissiveIntensity > 0) {
          obj.material.emissiveIntensity *= (1 + intensity * 0.5);
        }
      }
    });

    // If using real SplatMesh, adjust recolor and opacity for visual transformation
    if (this.splatMesh) {
      this.splatMesh.recolor = new THREE.Color(1.3, 1.1, 1.4);
    }

    // Add transformation lights
    const colors = [0x00ffaa, 0x00aaff, 0xff8844];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const light = new THREE.PointLight(
        colors[i % colors.length],
        3 * intensity,
        50
      );
      light.position.set(Math.cos(angle) * 30, 15, Math.sin(angle) * 30);
      light.name = 'transformation-light';
      this.worldGroup.add(light);
    }
  }

  dispose(): void {
    // Dispose SplatMesh if present
    if (this.splatMesh) {
      this.scene.remove(this.splatMesh);
      this.splatMesh.dispose();
      this.splatMesh = null;
    }

    this.worldGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.scene.remove(this.worldGroup);
  }
}
