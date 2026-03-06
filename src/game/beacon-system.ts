/**
 * Beacon System
 *
 * Manages 5 ancient beacons placed throughout the world.
 * Players discover and activate them to progress toward the final world event.
 */

import * as THREE from 'three';

export interface BeaconDef {
  id: string;
  name: string;
  position: THREE.Vector3;
  color: number;
  activated: boolean;
}

export interface BeaconSystemEvents {
  onBeaconActivated: (beacon: BeaconDef, total: number, remaining: number) => void;
  onAllBeaconsActivated: () => void;
  onNearBeacon: (beacon: BeaconDef | null) => void;
}

export class BeaconSystem {
  private scene: THREE.Scene;
  private beacons: BeaconDef[];
  private beaconMeshes: Map<string, THREE.Group> = new Map();
  private events: BeaconSystemEvents;
  private nearBeacon: BeaconDef | null = null;
  private readonly activationRange = 8;
  private activatedCount = 0;

  constructor(scene: THREE.Scene, events: BeaconSystemEvents) {
    this.scene = scene;
    this.events = events;

    this.beacons = [
      {
        id: 'beacon-1',
        name: 'Beacon of the Deep',
        position: new THREE.Vector3(-45, 3, -35),
        color: 0x00ffaa,
        activated: false,
      },
      {
        id: 'beacon-2',
        name: 'Spire of Echoes',
        position: new THREE.Vector3(50, 3, -25),
        color: 0x00aaff,
        activated: false,
      },
      {
        id: 'beacon-3',
        name: 'Crystal Obelisk',
        position: new THREE.Vector3(-30, 3, 45),
        color: 0x8844ff,
        activated: false,
      },
      {
        id: 'beacon-4',
        name: 'Luminous Altar',
        position: new THREE.Vector3(45, 3, 40),
        color: 0xff6644,
        activated: false,
      },
      {
        id: 'beacon-5',
        name: 'Nexus Pillar',
        position: new THREE.Vector3(0, 3, -55),
        color: 0xffaa00,
        activated: false,
      },
    ];

    this.createBeaconMeshes();
  }

  private createBeaconMeshes(): void {
    for (const beacon of this.beacons) {
      const group = new THREE.Group();
      group.name = beacon.id;
      group.position.copy(beacon.position);

      // Base platform
      const baseGeo = new THREE.CylinderGeometry(2, 2.5, 0.5, 8);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a4a,
        roughness: 0.5,
        metalness: 0.3,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.25;
      group.add(base);

      // Main pillar
      const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 6, 6);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a5a,
        roughness: 0.6,
        metalness: 0.2,
        emissive: beacon.color,
        emissiveIntensity: 0.1,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 3.5;
      pillar.name = 'pillar';
      group.add(pillar);

      // Floating crystal top
      const crystalGeo = new THREE.OctahedronGeometry(0.8, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: beacon.color,
        emissive: beacon.color,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: 0.8,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 7.5;
      crystal.name = 'crystal';
      group.add(crystal);

      // Glow ring
      const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: beacon.color,
        transparent: true,
        opacity: 0.2,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 7.5;
      ring.rotation.x = Math.PI / 2;
      ring.name = 'ring';
      group.add(ring);

      // Ambient light
      const light = new THREE.PointLight(beacon.color, 1, 20);
      light.position.y = 7.5;
      light.name = 'light';
      group.add(light);

      // Activation range indicator (subtle ground ring)
      const rangeGeo = new THREE.RingGeometry(this.activationRange - 0.5, this.activationRange, 32);
      const rangeMat = new THREE.MeshBasicMaterial({
        color: beacon.color,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
      });
      const rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
      rangeRing.rotation.x = -Math.PI / 2;
      rangeRing.position.y = 0.1;
      group.add(rangeRing);

      this.scene.add(group);
      this.beaconMeshes.set(beacon.id, group);
    }
  }

  /** Attempt to activate the nearest beacon */
  tryActivate(): boolean {
    if (!this.nearBeacon || this.nearBeacon.activated) return false;

    this.nearBeacon.activated = true;
    this.activatedCount++;
    this.activateVisuals(this.nearBeacon);

    this.events.onBeaconActivated(
      this.nearBeacon,
      this.beacons.length,
      this.beacons.length - this.activatedCount
    );

    if (this.activatedCount === this.beacons.length) {
      setTimeout(() => this.events.onAllBeaconsActivated(), 2000);
    }

    return true;
  }

  private activateVisuals(beacon: BeaconDef): void {
    const group = this.beaconMeshes.get(beacon.id);
    if (!group) return;

    // Intensify crystal
    const crystal = group.getObjectByName('crystal') as THREE.Mesh;
    if (crystal) {
      const mat = crystal.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.0;
      mat.opacity = 1.0;
    }

    // Intensify ring
    const ring = group.getObjectByName('ring') as THREE.Mesh;
    if (ring) {
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8;
    }

    // Intensify pillar glow
    const pillar = group.getObjectByName('pillar') as THREE.Mesh;
    if (pillar) {
      const mat = pillar.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6;
    }

    // Boost light
    const light = group.getObjectByName('light') as THREE.PointLight;
    if (light) {
      light.intensity = 5;
      light.distance = 40;
    }

    // Add activation particle burst
    this.createActivationBurst(beacon);

    // Add beam of light shooting up
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.1, 50, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: beacon.color,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 32;
    beam.name = 'beam';
    group.add(beam);
  }

  private createActivationBurst(beacon: BeaconDef): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = beacon.position.x;
      positions[i * 3 + 1] = beacon.position.y + 7.5;
      positions[i * 3 + 2] = beacon.position.z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 15 + 5,
        (Math.random() - 0.5) * 20
      ));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: beacon.color,
      size: 0.5,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const burst = new THREE.Points(geo, mat);
    burst.name = `burst-${beacon.id}`;
    this.scene.add(burst);

    // Animate burst
    let elapsed = 0;
    const animate = () => {
      elapsed += 0.016;
      const pos = burst.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        pos.setX(i, pos.getX(i) + velocities[i].x * 0.016);
        pos.setY(i, pos.getY(i) + velocities[i].y * 0.016);
        pos.setZ(i, pos.getZ(i) + velocities[i].z * 0.016);
        velocities[i].y -= 9.8 * 0.016;
      }
      pos.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - elapsed / 2);

      if (elapsed < 2) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(burst);
        geo.dispose();
        mat.dispose();
      }
    };
    requestAnimationFrame(animate);
  }

  update(time: number, playerPosition: THREE.Vector3): void {
    // Check proximity to beacons
    let closest: BeaconDef | null = null;
    let closestDist = Infinity;

    for (const beacon of this.beacons) {
      const dist = playerPosition.distanceTo(beacon.position);
      if (dist < this.activationRange && dist < closestDist && !beacon.activated) {
        closest = beacon;
        closestDist = dist;
      }
    }

    if (closest !== this.nearBeacon) {
      this.nearBeacon = closest;
      this.events.onNearBeacon(closest);
    }

    // Animate beacon crystals
    for (const [id, group] of this.beaconMeshes) {
      const crystal = group.getObjectByName('crystal') as THREE.Mesh;
      if (crystal) {
        crystal.rotation.y = time * 0.5;
        crystal.position.y = 7.5 + Math.sin(time * 1.5) * 0.3;
      }

      const ring = group.getObjectByName('ring') as THREE.Mesh;
      if (ring) {
        ring.rotation.z = time * 0.3;
        const beacon = this.beacons.find(b => b.id === id);
        if (beacon?.activated) {
          ring.scale.setScalar(1 + Math.sin(time * 2) * 0.2);
        }
      }

      // Pulse beam if activated
      const beam = group.getObjectByName('beam') as THREE.Mesh;
      if (beam) {
        const mat = beam.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15 + Math.sin(time * 3) * 0.1;
      }
    }
  }

  getBeacons(): BeaconDef[] {
    return [...this.beacons];
  }

  getActivatedCount(): number {
    return this.activatedCount;
  }

  getTotalCount(): number {
    return this.beacons.length;
  }

  /** Sync beacon state from network */
  syncBeaconState(id: string, activated: boolean): void {
    const beacon = this.beacons.find(b => b.id === id);
    if (beacon && !beacon.activated && activated) {
      beacon.activated = true;
      this.activatedCount++;
      this.activateVisuals(beacon);
    }
  }
}
