/**
 * World Labs Marble API Client
 *
 * Clean API client for World Labs World API.
 * Handles world generation, loading, and status polling.
 * Falls back to mock data when API key is not configured.
 */

import type { MarbleWorldConfig, MarbleWorldResponse, WorldLabsConfig } from './types';

const DEFAULT_CONFIG: WorldLabsConfig = {
  apiKey: '',
  baseUrl: 'https://api.worldlabs.ai/v1',
  timeout: 120000,
};

export class WorldLabsClient {
  private config: WorldLabsConfig;
  private isConfigured: boolean;

  constructor(config?: Partial<WorldLabsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isConfigured = !!this.config.apiKey;
  }

  get configured(): boolean {
    return this.isConfigured;
  }

  /** Generate a new Marble world from a text prompt */
  async generateWorld(
    worldConfig: MarbleWorldConfig,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldResponse> {
    if (!this.isConfigured) {
      return this.mockGeneration(worldConfig, onProgress);
    }

    try {
      onProgress?.(0.05, 'Submitting world generation request...');

      const response = await fetch(`${this.config.baseUrl}/worlds/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: worldConfig.prompt,
          style: worldConfig.style || 'fantasy',
          resolution: worldConfig.resolution || 'medium',
          seed: worldConfig.seed,
          output_format: 'splat',
        }),
      });

      if (!response.ok) {
        throw new Error(`World Labs API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { world_id: string };
      onProgress?.(0.1, 'World generation started...');

      return this.pollWorldStatus(data.world_id, onProgress);
    } catch (error) {
      console.warn('World Labs API call failed, falling back to mock:', error);
      return this.mockGeneration(worldConfig, onProgress);
    }
  }

  /** Load an existing Marble world by ID */
  async loadWorld(
    worldId: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldResponse> {
    if (!this.isConfigured) {
      return this.mockGeneration(
        { prompt: 'Bioluminescent canyon with giant ruins and floating pathways' },
        onProgress
      );
    }

    try {
      onProgress?.(0.1, 'Loading world assets...');

      const response = await fetch(`${this.config.baseUrl}/worlds/${worldId}`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to load world: ${response.status}`);
      }

      const data = await response.json() as MarbleWorldResponse;
      onProgress?.(1.0, 'World loaded');
      return data;
    } catch (error) {
      console.warn('Failed to load world, using fallback:', error);
      return this.mockGeneration(
        { prompt: 'Bioluminescent canyon with giant ruins and floating pathways' },
        onProgress
      );
    }
  }

  /** Poll world generation status until complete */
  private async pollWorldStatus(
    worldId: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldResponse> {
    const maxAttempts = 120;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${this.config.baseUrl}/worlds/${worldId}/status`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Status poll failed: ${response.status}`);
      }

      const data = await response.json() as MarbleWorldResponse;
      onProgress?.(data.progress, this.statusMessage(data.progress));

      if (data.status === 'completed') return data;
      if (data.status === 'failed') throw new Error(data.error || 'World generation failed');

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('World generation timed out');
  }

  /** Mock world generation for development/demo without API key */
  private async mockGeneration(
    config: MarbleWorldConfig,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldResponse> {
    const stages = [
      [0.05, 'Initializing Marble API...'],
      [0.15, 'Parsing world prompt...'],
      [0.25, 'Generating spatial layout...'],
      [0.40, 'Computing gaussian splat field...'],
      [0.55, 'Rendering world geometry...'],
      [0.70, 'Adding environmental details...'],
      [0.85, 'Optimizing splat density...'],
      [0.95, 'Finalizing world assets...'],
      [1.00, 'World ready'],
    ] as const;

    for (const [progress, status] of stages) {
      onProgress?.(progress, status);
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    }

    return {
      id: `mock-world-${Date.now()}`,
      status: 'completed',
      progress: 1.0,
      assets: [{
        id: `asset-${Date.now()}`,
        url: '__mock__',
        format: 'splat',
        metadata: {
          prompt: config.prompt,
          created: new Date().toISOString(),
          resolution: [1024, 1024, 1024],
          pointCount: 2_000_000,
        },
      }],
    };
  }

  private statusMessage(progress: number): string {
    if (progress < 0.2) return 'Starting world generation...';
    if (progress < 0.4) return 'Building spatial structure...';
    if (progress < 0.6) return 'Computing gaussian splats...';
    if (progress < 0.8) return 'Adding world details...';
    if (progress < 1.0) return 'Finalizing...';
    return 'World ready';
  }
}
