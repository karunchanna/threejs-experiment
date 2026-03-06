/**
 * Multiplayer Networking Layer (Stub)
 *
 * Architected for small-room WebSocket multiplayer.
 * Currently implements ghost explorers (simulated remote players)
 * with clear extension points for real networking.
 *
 * To upgrade to real multiplayer:
 * 1. Replace MockTransport with WebSocketTransport
 * 2. Deploy the room server (see network/server-spec.ts)
 * 3. Sync beacon activations via room state
 */

import * as THREE from 'three';

export interface PlayerState {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  isGhost: boolean;
}

export interface NetworkEvents {
  onPlayerJoin: (player: PlayerState) => void;
  onPlayerLeave: (playerId: string) => void;
  onPlayerUpdate: (player: PlayerState) => void;
  onBeaconSync: (beaconId: string, activated: boolean) => void;
}

interface Transport {
  connect(roomId: string): Promise<void>;
  send(type: string, data: unknown): void;
  onMessage(handler: (type: string, data: unknown) => void): void;
  disconnect(): void;
}

/** Simulated transport that creates ghost explorers */
class MockTransport implements Transport {
  private handler: ((type: string, data: unknown) => void) | null = null;
  private ghosts: PlayerState[] = [];
  private interval: number | null = null;

  async connect(_roomId: string): Promise<void> {
    // Simulate 2-3 ghost explorers
    const ghostCount = 2 + Math.floor(Math.random() * 2);
    const ghostNames = ['Wanderer', 'Scout', 'Seeker', 'Explorer'];

    for (let i = 0; i < ghostCount; i++) {
      const ghost: PlayerState = {
        id: `ghost-${i}`,
        name: ghostNames[i],
        position: [
          (Math.random() - 0.5) * 100,
          5 + Math.random() * 10,
          (Math.random() - 0.5) * 100,
        ],
        rotation: [0, 0, 0, 1],
        isGhost: true,
      };
      this.ghosts.push(ghost);
      setTimeout(() => {
        this.handler?.('player_join', ghost);
      }, 1000 + i * 2000);
    }

    // Simulate ghost movement
    this.interval = window.setInterval(() => {
      for (const ghost of this.ghosts) {
        const time = Date.now() * 0.001;
        const idx = parseInt(ghost.id.split('-')[1]);
        const speed = 0.3 + idx * 0.1;
        const radius = 20 + idx * 15;

        ghost.position[0] = Math.cos(time * speed + idx * 2) * radius;
        ghost.position[1] = 5 + Math.sin(time * 0.5 + idx) * 3;
        ghost.position[2] = Math.sin(time * speed + idx * 2) * radius;

        this.handler?.('player_update', ghost);
      }
    }, 100);
  }

  send(_type: string, _data: unknown): void {
    // Mock: no-op
  }

  onMessage(handler: (type: string, data: unknown) => void): void {
    this.handler = handler;
  }

  disconnect(): void {
    if (this.interval) clearInterval(this.interval);
    this.ghosts = [];
  }
}

/**
 * WebSocket transport for real multiplayer (extension point)
 *
 * Usage:
 *   const transport = new WebSocketTransport('wss://your-server.com');
 *   const network = new MultiplayerManager(events, transport);
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class _WebSocketTransport implements Transport {
  private ws: WebSocket | null = null;
  private handler: ((type: string, data: unknown) => void) | null = null;

  constructor(private serverUrl: string) {}

  async connect(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.serverUrl}/rooms/${roomId}`);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        this.handler?.(msg.type, msg.data);
      };
    });
  }

  send(type: string, data: unknown): void {
    this.ws?.send(JSON.stringify({ type, data }));
  }

  onMessage(handler: (type: string, data: unknown) => void): void {
    this.handler = handler;
  }

  disconnect(): void {
    this.ws?.close();
  }
}

export class MultiplayerManager {
  private transport: Transport;
  private events: NetworkEvents;
  private remotePlayers: Map<string, THREE.Group> = new Map();
  private scene: THREE.Scene | null = null;
  private playerCount = 1; // Self

  constructor(events: NetworkEvents, transport?: Transport) {
    this.events = events;
    this.transport = transport || new MockTransport();
  }

  async connect(roomId: string, scene: THREE.Scene): Promise<void> {
    this.scene = scene;

    this.transport.onMessage((type, data) => {
      switch (type) {
        case 'player_join':
          this.handlePlayerJoin(data as PlayerState);
          break;
        case 'player_leave':
          this.handlePlayerLeave((data as { id: string }).id);
          break;
        case 'player_update':
          this.handlePlayerUpdate(data as PlayerState);
          break;
        case 'beacon_sync':
          this.events.onBeaconSync(
            (data as { beaconId: string }).beaconId,
            (data as { activated: boolean }).activated
          );
          break;
      }
    });

    await this.transport.connect(roomId);
  }

  private handlePlayerJoin(player: PlayerState): void {
    this.playerCount++;

    // Create ghost avatar mesh
    const avatar = this.createGhostAvatar(player);
    this.remotePlayers.set(player.id, avatar);
    this.scene?.add(avatar);

    this.events.onPlayerJoin(player);
  }

  private handlePlayerLeave(playerId: string): void {
    this.playerCount--;
    const avatar = this.remotePlayers.get(playerId);
    if (avatar) {
      this.scene?.remove(avatar);
      this.remotePlayers.delete(playerId);
    }
    this.events.onPlayerLeave(playerId);
  }

  private handlePlayerUpdate(player: PlayerState): void {
    const avatar = this.remotePlayers.get(player.id);
    if (avatar) {
      // Smooth interpolation
      avatar.position.lerp(
        new THREE.Vector3(...player.position),
        0.15
      );
    }
    this.events.onPlayerUpdate(player);
  }

  private createGhostAvatar(player: PlayerState): THREE.Group {
    const group = new THREE.Group();
    group.name = `player-${player.id}`;

    // Ghost body - translucent humanoid shape
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4,
      roughness: 0.3,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    group.add(body);

    // Ghost head
    const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const head = new THREE.Mesh(headGeo, bodyMat.clone());
    head.position.y = 2.2;
    group.add(head);

    // Name label light
    const nameLight = new THREE.PointLight(0x4488ff, 0.5, 8);
    nameLight.position.y = 3;
    group.add(nameLight);

    group.position.set(...player.position);
    return group;
  }

  /** Send local player state to network */
  sendPlayerState(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.transport.send('player_update', {
      position: [position.x, position.y, position.z],
      rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    });
  }

  /** Send beacon activation to network */
  sendBeaconActivation(beaconId: string): void {
    this.transport.send('beacon_activate', { beaconId });
  }

  getPlayerCount(): number {
    return this.playerCount;
  }

  disconnect(): void {
    this.transport.disconnect();
    for (const [, avatar] of this.remotePlayers) {
      this.scene?.remove(avatar);
    }
    this.remotePlayers.clear();
    this.playerCount = 1;
  }
}
