/**
 * SparkJS World Renderer
 *
 * Abstraction layer for rendering Marble splat/world content in the browser.
 * SparkJS is the recommended web renderer for World Labs assets, built on Three.js.
 *
 * This module:
 * - Loads gaussian splat assets from the Marble API
 * - Integrates SparkJS rendering into a Three.js scene
 * - Falls back to a procedural gaussian-splat-inspired world when assets aren't available
 *
 * SparkJS integration pattern:
 * SparkJS creates its own rendering context that composites with Three.js.
 * The splat world is rendered as a separate layer that the Three.js camera controls.
 */

import * as THREE from 'three';
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
  private isLoaded = false;

  constructor(private config: SparkJSConfig) {
    this.scene = config.scene;
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'marble-world';
    this.scene.add(this.worldGroup);
  }

  /**
   * Load and render a Marble world asset.
   * When SparkJS CDN/npm package is available, this would use:
   *   import { SparkRenderer } from '@worldlabs/sparkjs';
   *   const spark = new SparkRenderer({ canvas, camera });
   *   await spark.loadSplat(asset.url);
   *
   * For now, builds a spectacular procedural world that represents
   * what the Marble-generated world would look like.
   */
  async loadWorld(
    asset: MarbleWorldAsset,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (asset.url !== '__mock__') {
      // Real SparkJS integration path
      try {
        await this.loadSparkJSWorld(asset, onProgress);
        return;
      } catch (e) {
        console.warn('SparkJS load failed, using procedural fallback:', e);
      }
    }

    // Procedural world that showcases what a Marble world would look like
    await this.buildProceduralWorld(asset, onProgress);
    this.isLoaded = true;
  }

  /**
   * Real SparkJS integration (for when the package is available)
   * SparkJS renders gaussian splats using WebGL2 compute shaders
   * and composites with the Three.js scene.
   */
  private async loadSparkJSWorld(
    asset: MarbleWorldAsset,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // SparkJS integration point:
    // const { SparkRenderer } = await import('@worldlabs/sparkjs');
    // const sparkRenderer = new SparkRenderer({
    //   canvas: this.config.canvas,
    //   camera: this.config.camera,
    //   renderer: this.config.renderer,
    // });
    // await sparkRenderer.loadSplat(asset.url, {
    //   onProgress: (p) => onProgress?.(p),
    //   quality: 'high',
    //   sortMode: 'gpu',
    // });
    // this.sparkInstance = sparkRenderer;

    onProgress?.(1.0);
    throw new Error('SparkJS package not yet available - using procedural world');
  }

  /** Build a spectacular procedural world inspired by the prompt */
  private async buildProceduralWorld(
    asset: MarbleWorldAsset,
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
    // Main canyon floor
    const floorGeo = new THREE.PlaneGeometry(400, 400, 128, 128);
    const positions = floorGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      // Canyon-shaped terrain with valleys
      let y = 0;
      y += Math.sin(x * 0.015) * 8;
      y += Math.cos(z * 0.02) * 6;
      y += Math.sin(x * 0.05 + z * 0.03) * 3;
      y += (Math.random() - 0.5) * 1.5;
      // Central valley
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

    // Water/crystal floor in the deep valley
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

    // Create canyon walls using displaced boxes
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const radius = 80 + Math.sin(angle * 3) * 30 + Math.random() * 20;
      const height = 30 + Math.random() * 50;
      const width = 8 + Math.random() * 15;
      const depth = 8 + Math.random() * 15;

      const geo = new THREE.BoxGeometry(width, height, depth, 2, 4, 2);
      // Displace vertices for organic look
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

    // Internal canyon pillars
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

    // Central monument base
    const monumentGeo = new THREE.CylinderGeometry(8, 10, 25, 8);
    const monument = new THREE.Mesh(monumentGeo, ruinMat.clone());
    monument.position.set(0, 12.5, 0);
    monument.name = 'central-monument';
    this.worldGroup.add(monument);

    // Monument top ring
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

    // Scattered ruin blocks
    const ruinPositions = [
      [-25, 0, -30], [30, 0, -20], [-15, 0, 35],
      [40, 0, 25], [-35, 0, 10], [20, 0, -40],
      [-40, 0, -15], [10, 0, 45], [45, 0, -10],
    ];

    for (const [rx, _ry, rz] of ruinPositions) {
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

    // Archways
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
    // Left pillar
    const lGeo = new THREE.BoxGeometry(1.5, height, 1.5);
    const left = new THREE.Mesh(lGeo, mat);
    left.position.set(x - Math.cos(rotation) * spacing, y + height / 2, z - Math.sin(rotation) * spacing);
    this.worldGroup.add(left);

    // Right pillar
    const right = new THREE.Mesh(lGeo.clone(), mat.clone());
    right.position.set(x + Math.cos(rotation) * spacing, y + height / 2, z + Math.sin(rotation) * spacing);
    this.worldGroup.add(right);

    // Top lintel
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

    // Floating stone slabs creating walkways
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

    // Large floating platforms
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
    // Glowing crystals/fungi scattered around
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

      // Add point light for some crystals
      if (Math.random() < 0.15) {
        const light = new THREE.PointLight(color, 2, 15);
        light.position.copy(crystal.position);
        light.position.y += height;
        this.worldGroup.add(light);
      }
    }

    // Glowing veins on the ground
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
    // Volumetric fog planes at various heights
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

    // Distant mountains/canyon backdrop
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
    // Gaussian-splat-inspired particle system
    // Simulates the visual character of splat rendering with floating luminous points
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

  /** Update splat particles and animated elements */
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

    // Animate monument ring
    const ring = this.worldGroup.getObjectByName('monument-ring') as THREE.Mesh | undefined;
    if (ring) {
      ring.rotation.z = time * 0.2;
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(time) * 0.1;
    }
  }

  /** Get the world group for collision/interaction queries */
  getWorldGroup(): THREE.Group {
    return this.worldGroup;
  }

  /** Trigger visual transformation on the world (for final beacon activation) */
  triggerWorldTransformation(intensity: number): void {
    // Brighten emissive materials
    this.worldGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        if (obj.material.emissiveIntensity > 0) {
          obj.material.emissiveIntensity *= (1 + intensity * 0.5);
        }
      }
    });

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
