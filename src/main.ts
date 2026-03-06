/**
 * Marble Expedition - Main Entry Point
 *
 * Orchestrates:
 * - World Labs Marble API client → world generation
 * - SparkJS renderer → world rendering (with procedural fallback)
 * - Three.js → camera, player, interactions, effects
 * - Game systems → beacons, progression, final world event
 * - UI → HUD, screens, notifications
 * - Network → ghost explorers / multiplayer stub
 */

import * as THREE from 'three';

import { WorldLabsClient } from './worldlabs';
import { SparkJSWorldRenderer } from './renderer';
import { createScene, createPortal } from './game/scene-setup';
import { PlayerController } from './game/player-controller';
import { BeaconSystem } from './game/beacon-system';
import { HUDManager } from './ui/hud';
import { ScreenManager } from './ui/screens';
import { MultiplayerManager } from './network/multiplayer';

class MarbleExpedition {
  // Core systems
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // World
  private worldLabsClient!: WorldLabsClient;
  private worldRenderer!: SparkJSWorldRenderer;

  // Game
  private playerController!: PlayerController;
  private beaconSystem!: BeaconSystem;
  private portal!: THREE.Group;

  // UI
  private hud!: HUDManager;
  private screens!: ScreenManager;

  // Network
  private multiplayer!: MultiplayerManager;

  // State
  private clock = new THREE.Clock();
  private isRunning = false;
  private worldCompleted = false;

  constructor() {
    this.init();
  }

  private init(): void {
    // Initialize screens
    this.screens = new ScreenManager();
    this.hud = new HUDManager();

    // Initialize World Labs client
    // API key can be set via environment variable or URL parameter
    const apiKey = this.getConfigValue('WORLDLABS_API_KEY');
    this.worldLabsClient = new WorldLabsClient({
      apiKey,
      baseUrl: this.getConfigValue('WORLDLABS_API_URL') || 'https://api.worldlabs.ai/v1',
    });

    if (!this.worldLabsClient.configured) {
      console.log(
        '%c[Marble Expedition] No World Labs API key configured. Using procedural world fallback.',
        'color: #88aaff'
      );
      console.log(
        '%cTo use the Marble API, set VITE_WORLDLABS_API_KEY in your .env file.',
        'color: #666'
      );
    }

    // Bind button events
    document.getElementById('btn-enter-world')!.addEventListener('click', () => {
      this.startExpedition('enter');
    });
    document.getElementById('btn-generate-world')!.addEventListener('click', () => {
      this.startExpedition('generate');
    });
    document.getElementById('btn-restart')!.addEventListener('click', () => {
      this.restart();
    });

    // E key for beacon activation
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.isRunning) {
        const activated = this.beaconSystem.tryActivate();
        if (activated) {
          this.multiplayer.sendBeaconActivation('');
        }
      }
    });
  }

  private getConfigValue(key: string): string {
    // Check URL params first, then Vite env vars
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get(key);
    if (fromUrl) return fromUrl;

    // Vite env vars
    const envKey = `VITE_${key}`;
    return (import.meta as unknown as { env: Record<string, string> }).env?.[envKey] || '';
  }

  private async startExpedition(mode: 'enter' | 'generate'): Promise<void> {
    this.screens.showLoading();

    try {
      // Phase 1: Generate/load world via Marble API
      const worldPrompt = 'Bioluminescent canyon with giant ruins and floating pathways, ' +
        'ancient alien civilization, glowing crystals, mysterious fog, dramatic vista';

      const worldResponse = mode === 'generate'
        ? await this.worldLabsClient.generateWorld(
          { prompt: worldPrompt, style: 'fantasy', resolution: 'high' },
          (progress, status) => this.screens.updateLoading(progress * 0.5, status)
        )
        : await this.worldLabsClient.loadWorld(
          'default-world',
          (progress, status) => this.screens.updateLoading(progress * 0.5, status)
        );

      if (!worldResponse.assets?.length) {
        throw new Error('No world assets returned');
      }

      this.screens.updateLoading(0.5, 'Initializing renderer...');

      // Phase 2: Set up Three.js scene
      const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
      const ctx = createScene(canvas);
      this.scene = ctx.scene;
      this.camera = ctx.camera;
      this.renderer = ctx.renderer;

      // Phase 3: Load world via SparkJS renderer
      this.screens.updateLoading(0.55, 'Loading world into SparkJS...');
      this.worldRenderer = new SparkJSWorldRenderer({
        canvas,
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer,
      });

      await this.worldRenderer.loadWorld(
        worldResponse.assets[0],
        (p) => this.screens.updateLoading(0.55 + p * 0.3, 'Rendering world...')
      );

      this.screens.updateLoading(0.85, 'Placing beacons...');

      // Phase 4: Set up game systems
      this.setupGameSystems();

      this.screens.updateLoading(0.9, 'Connecting explorers...');

      // Phase 5: Set up multiplayer
      await this.setupMultiplayer();

      this.screens.updateLoading(1.0, 'Entering world...');

      // Phase 6: Start
      await new Promise(r => setTimeout(r, 500));
      this.screens.hideLoading();
      this.hud.show();
      this.isRunning = true;
      this.clock.start();
      this.animate();

      // Show entry notification
      setTimeout(() => {
        this.hud.showNotification('Click to look around  •  WASD to move', 5000);
      }, 500);

    } catch (error) {
      console.error('Failed to start expedition:', error);
      this.screens.updateLoading(0, `Error: ${(error as Error).message}`);
    }
  }

  private setupGameSystems(): void {
    // Player controller
    this.playerController = new PlayerController({
      camera: this.camera,
      domElement: document.getElementById('render-canvas')!,
      spawnPosition: new THREE.Vector3(0, 15, 65),
      spawnLookAt: new THREE.Vector3(0, 10, 0),
    });

    // Beacon system
    this.beaconSystem = new BeaconSystem(this.scene, {
      onBeaconActivated: (beacon, total, remaining) => {
        this.hud.completeObjective(beacon);
        this.hud.updateBeaconCount(total - remaining, total);
        this.hud.showNotification(
          remaining > 0
            ? `${beacon.name} Activated  •  ${remaining} remaining`
            : `${beacon.name} Activated  •  Final beacon!`,
          3000
        );
      },
      onAllBeaconsActivated: () => {
        this.triggerFinalEvent();
      },
      onNearBeacon: (beacon) => {
        this.hud.showInteractPrompt(!!beacon, beacon ? `Press [E] to Activate ${beacon.name}` : undefined);
      },
    });

    // Initialize HUD
    this.hud.initObjectives(this.beaconSystem.getBeacons());
    this.hud.updateBeaconCount(0, this.beaconSystem.getTotalCount());

    // Portal (hidden until final event)
    this.portal = createPortal(this.scene, new THREE.Vector3(0, 0, 0));
  }

  private async setupMultiplayer(): Promise<void> {
    this.multiplayer = new MultiplayerManager({
      onPlayerJoin: (player) => {
        this.hud.setPlayerCount(this.multiplayer.getPlayerCount());
        this.hud.showNotification(`${player.name} joined the expedition`, 2000);
      },
      onPlayerLeave: (playerId) => {
        this.hud.setPlayerCount(this.multiplayer.getPlayerCount());
        console.log('Player left:', playerId);
      },
      onPlayerUpdate: () => {
        // Ghost positions update automatically via mesh interpolation
      },
      onBeaconSync: (beaconId, activated) => {
        this.beaconSystem.syncBeaconState(beaconId, activated);
      },
    });

    const roomId = new URLSearchParams(window.location.search).get('room') || 'default';
    await this.multiplayer.connect(roomId, this.scene);
    this.hud.setPlayerCount(1);
  }

  private triggerFinalEvent(): void {
    if (this.worldCompleted) return;
    this.worldCompleted = true;

    this.hud.showNotification('The world awakens...', 4000);

    // Trigger world transformation
    setTimeout(() => {
      this.worldRenderer.triggerWorldTransformation(1.0);
    }, 1000);

    // Open portal
    setTimeout(() => {
      this.portal.visible = true;
      this.hud.showNotification('A portal has opened', 4000);
    }, 3000);

    // Change sky color
    setTimeout(() => {
      const targetBg = new THREE.Color(0x0a1530);
      const currentBg = this.scene.background as THREE.Color;
      const startBg = currentBg.clone();
      let t = 0;
      const skyAnim = () => {
        t += 0.01;
        currentBg.lerpColors(startBg, targetBg, Math.min(t, 1));
        if (t < 1) requestAnimationFrame(skyAnim);
      };
      skyAnim();

      // Increase fog density then reduce for dramatic effect
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 0.008;
        setTimeout(() => {
          if (this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.density = 0.002;
          }
        }, 2000);
      }
    }, 2000);

    // Show completion screen after delay
    setTimeout(() => {
      this.screens.showCompletion();
    }, 8000);
  }

  private animate(): void {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    // Update systems
    this.playerController.update(dt);
    this.beaconSystem.update(time, this.playerController.position);
    this.worldRenderer.update(time);

    // Update HUD
    this.hud.updateCompass(this.playerController.getForwardAngle());
    this.hud.setMode(this.playerController.isPhotoMode ? 'Photo Mode [P]' : 'Explore Mode');

    // Send player state to network
    this.multiplayer.sendPlayerState(
      this.playerController.position,
      this.camera.quaternion
    );

    // Animate portal
    if (this.portal.visible) {
      const ring = this.portal.getObjectByName('portal-ring') as THREE.Mesh;
      if (ring) ring.rotation.z = time * 0.5;
      const inner = this.portal.getObjectByName('portal-inner') as THREE.Mesh;
      if (inner) {
        inner.rotation.z = -time * 0.3;
        const mat = inner.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(time * 2) * 0.2;
      }
      const halo = this.portal.getObjectByName('portal-halo') as THREE.Points;
      if (halo) halo.rotation.z = time * 0.2;
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private restart(): void {
    this.isRunning = false;
    this.worldCompleted = false;

    // Cleanup
    this.multiplayer?.disconnect();
    this.worldRenderer?.dispose();

    // Reset UI
    this.screens.hideCompletion();
    this.screens.reset();
    this.hud.hide();

    // Clear scene children except camera
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
}

// Boot
new MarbleExpedition();
