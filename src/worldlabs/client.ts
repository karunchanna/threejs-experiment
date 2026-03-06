/**
 * World Labs Marble API Client
 *
 * Clean API client for the World Labs World API (Marble v1).
 * Base URL: https://api.worldlabs.ai/marble/v1
 * Auth: WLT-Api-Key header
 *
 * Handles world generation, operation polling, world loading, and
 * falls back to mock data when API key is not configured.
 *
 * Docs: https://docs.worldlabs.ai/api
 */

import type {
  MarbleWorldConfig,
  MarbleWorldAsset,
  MarbleGenerateResponse,
  MarbleOperationResponse,
  MarbleWorldResponse,
  WorldLabsConfig,
} from './types';

const DEFAULT_CONFIG: WorldLabsConfig = {
  apiKey: '',
  baseUrl: 'https://api.worldlabs.ai/marble/v1',
  timeout: 600000, // 10 min for marble-0.1-plus
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

  private get headers(): Record<string, string> {
    return {
      'WLT-Api-Key': this.config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generate a new Marble world from a text prompt.
   *
   * Flow:
   * 1. POST /worlds:generate → returns operation_id
   * 2. Poll GET /operations/{operation_id} until done
   * 3. GET /worlds/{world_id} to fetch assets
   * 4. Return MarbleWorldAsset with SPZ URLs for SparkJS
   */
  async generateWorld(
    worldConfig: MarbleWorldConfig,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldAsset> {
    if (!this.isConfigured) {
      return this.mockGeneration(worldConfig, onProgress);
    }

    try {
      onProgress?.(0.05, 'Submitting world generation request...');

      // Step 1: Start generation
      const genResponse = await fetch(`${this.config.baseUrl}/worlds:generate`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          display_name: worldConfig.displayName || 'Marble Expedition World',
          world_prompt: {
            type: 'text',
            text_prompt: worldConfig.prompt,
          },
          model: worldConfig.model || 'marble-0.1-mini',
          seed: worldConfig.seed,
          tags: worldConfig.tags || ['marble-expedition'],
        }),
      });

      if (!genResponse.ok) {
        const errText = await genResponse.text();
        throw new Error(`World Labs API error: ${genResponse.status} ${errText}`);
      }

      const genData = await genResponse.json() as MarbleGenerateResponse;
      onProgress?.(0.1, 'World generation started...');

      // Step 2: Poll operation until done
      const worldId = await this.pollOperation(genData.operation_id, onProgress);
      onProgress?.(0.85, 'Loading world assets...');

      // Step 3: Fetch complete world with assets
      return await this.fetchWorldAsset(worldId, worldConfig.prompt);

    } catch (error) {
      console.warn('World Labs API call failed, falling back to mock:', error);
      return this.mockGeneration(worldConfig, onProgress);
    }
  }

  /**
   * Load an existing Marble world by ID.
   * Fetches assets directly from GET /worlds/{world_id}.
   */
  async loadWorld(
    worldId: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldAsset> {
    if (!this.isConfigured) {
      return this.mockGeneration(
        { prompt: 'Bioluminescent canyon with giant ruins and floating pathways' },
        onProgress
      );
    }

    try {
      onProgress?.(0.1, 'Loading world assets...');
      const asset = await this.fetchWorldAsset(worldId, '');
      onProgress?.(1.0, 'World loaded');
      return asset;
    } catch (error) {
      console.warn('Failed to load world, using fallback:', error);
      return this.mockGeneration(
        { prompt: 'Bioluminescent canyon with giant ruins and floating pathways' },
        onProgress
      );
    }
  }

  /** Poll GET /operations/{id} until done, returns world_id */
  private async pollOperation(
    operationId: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<string> {
    const maxAttempts = 300; // Up to 10 min at 2s intervals
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${this.config.baseUrl}/operations/${operationId}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Operation poll failed: ${response.status}`);
      }

      const data = await response.json() as MarbleOperationResponse;

      // Estimate progress based on poll count (API doesn't provide granular progress)
      const estimatedProgress = 0.1 + Math.min(0.7, (i / 30) * 0.7);
      onProgress?.(estimatedProgress, this.statusMessage(estimatedProgress));

      if (data.done) {
        if (data.error) {
          throw new Error(`Generation failed: ${data.error.message}`);
        }
        if (!data.world_id) {
          throw new Error('Generation completed but no world_id returned');
        }
        return data.world_id;
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('World generation timed out');
  }

  /** Fetch a world and extract the asset URLs for rendering */
  private async fetchWorldAsset(worldId: string, prompt: string): Promise<MarbleWorldAsset> {
    const response = await fetch(
      `${this.config.baseUrl}/worlds/${worldId}`,
      { headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch world: ${response.status}`);
    }

    const world = await response.json() as MarbleWorldResponse;

    if (!world.assets?.splats?.spz_urls) {
      throw new Error('World has no splat assets');
    }

    // Prefer 500k resolution for good quality/performance balance, fall back to others
    const spzUrl = world.assets.splats.spz_urls['500k']
      || world.assets.splats.spz_urls.full_res
      || world.assets.splats.spz_urls['100k'];

    if (!spzUrl) {
      throw new Error('No SPZ URL found in world assets');
    }

    return {
      id: world.id,
      spzUrl,
      colliderUrl: world.assets.mesh?.collider_mesh_url,
      isMock: false,
      metadata: {
        prompt,
        caption: world.assets.caption,
        created: new Date().toISOString(),
      },
    };
  }

  /** List existing worlds (for future "choose a world" UI) */
  async listWorlds(): Promise<MarbleWorldResponse[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await fetch(`${this.config.baseUrl}/worlds:list`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ tags: ['marble-expedition'] }),
      });

      if (!response.ok) return [];
      const data = await response.json() as { worlds: MarbleWorldResponse[] };
      return data.worlds || [];
    } catch {
      return [];
    }
  }

  /** Mock world generation for development/demo without API key */
  private async mockGeneration(
    config: MarbleWorldConfig,
    onProgress?: (progress: number, status: string) => void
  ): Promise<MarbleWorldAsset> {
    const stages = [
      [0.05, 'Initializing Marble API...'],
      [0.15, 'Parsing world prompt...'],
      [0.25, 'Generating spatial layout...'],
      [0.40, 'Computing gaussian splat field...'],
      [0.55, 'Rendering world geometry...'],
      [0.70, 'Adding environmental details...'],
      [0.85, 'Optimizing SPZ splat density...'],
      [0.95, 'Finalizing world assets...'],
      [1.00, 'World ready'],
    ] as const;

    for (const [progress, status] of stages) {
      onProgress?.(progress, status);
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    }

    return {
      id: `mock-world-${Date.now()}`,
      spzUrl: '__mock__',
      isMock: true,
      metadata: {
        prompt: config.prompt,
        caption: `A generated world: ${config.prompt}`,
        created: new Date().toISOString(),
      },
    };
  }

  private statusMessage(progress: number): string {
    if (progress < 0.2) return 'Starting world generation...';
    if (progress < 0.4) return 'Building spatial structure...';
    if (progress < 0.6) return 'Computing gaussian splats...';
    if (progress < 0.8) return 'Adding world details...';
    if (progress < 1.0) return 'Finalizing SPZ assets...';
    return 'World ready';
  }
}
