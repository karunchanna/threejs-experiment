/**
 * Multiplayer Room Server Specification
 *
 * This file documents the server architecture for real multiplayer.
 * Implement as a lightweight WebSocket server (Node.js, Deno, or Bun).
 *
 * Protocol:
 *
 * Client → Server:
 *   { type: "join", data: { name: string, roomId: string } }
 *   { type: "player_update", data: { position: [x,y,z], rotation: [x,y,z,w] } }
 *   { type: "beacon_activate", data: { beaconId: string } }
 *   { type: "ping", data: { emote?: string, position: [x,y,z] } }
 *
 * Server → Client:
 *   { type: "player_join", data: PlayerState }
 *   { type: "player_leave", data: { id: string } }
 *   { type: "player_update", data: PlayerState }
 *   { type: "beacon_sync", data: { beaconId: string, activated: boolean } }
 *   { type: "room_state", data: { players: PlayerState[], beacons: Record<string, boolean> } }
 *
 * Room lifecycle:
 * - Rooms are created on first join, destroyed when empty
 * - Max 8 players per room
 * - Server broadcasts all player updates at 10 Hz
 * - Beacon state is authoritative on the server
 *
 * Example server implementation (Node.js + ws):
 *
 * ```typescript
 * import { WebSocketServer } from 'ws';
 *
 * const wss = new WebSocketServer({ port: 8080 });
 * const rooms = new Map<string, Room>();
 *
 * wss.on('connection', (ws) => {
 *   ws.on('message', (raw) => {
 *     const msg = JSON.parse(raw.toString());
 *     switch (msg.type) {
 *       case 'join':
 *         joinRoom(ws, msg.data.roomId, msg.data.name);
 *         break;
 *       case 'player_update':
 *         broadcastToRoom(ws, msg);
 *         break;
 *       case 'beacon_activate':
 *         activateBeacon(ws, msg.data.beaconId);
 *         break;
 *     }
 *   });
 * });
 * ```
 */

export {};
