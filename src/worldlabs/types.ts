/**
 * World Labs Marble API Type Definitions
 *
 * Based on the Marble v1 API documentation:
 * https://docs.worldlabs.ai/api
 *
 * Models:
 * - Marble 0.1-plus: high-quality production (~5 min)
 * - Marble 0.1-mini: quick drafts/iteration (~30-45 sec)
 */

export interface MarbleWorldConfig {
  /** Text prompt describing the world to generate */
  prompt: string;
  /** Display name for the generated world */
  displayName?: string;
  /** Model to use: 'marble-0.1-plus' (quality) or 'marble-0.1-mini' (speed) */
  model?: 'marble-0.1-plus' | 'marble-0.1-mini';
  /** Reproducibility seed */
  seed?: number;
  /** Tags for organizing worlds */
  tags?: string[];
}

/** SPZ splat assets at multiple resolutions */
export interface MarbleSplatAssets {
  spz_urls: {
    '100k'?: string;
    '500k'?: string;
    full_res?: string;
  };
}

/** Mesh assets for collision/physics */
export interface MarbleMeshAssets {
  collider_mesh_url?: string;
}

/** Imagery assets */
export interface MarbleImageryAssets {
  pano_url?: string;
}

/** Complete asset bundle returned for a generated world */
export interface MarbleWorldAssets {
  caption?: string;
  thumbnail_url?: string;
  splats: MarbleSplatAssets;
  mesh?: MarbleMeshAssets;
  imagery?: MarbleImageryAssets;
}

/** Response from the generate endpoint (returns an operation ID for polling) */
export interface MarbleGenerateResponse {
  operation_id: string;
}

/** Response from the operation status endpoint */
export interface MarbleOperationResponse {
  done: boolean;
  world_id?: string;
  error?: { code: number; message: string };
}

/** Full world object returned by the worlds/{id} endpoint */
export interface MarbleWorldResponse {
  id: string;
  display_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  assets?: MarbleWorldAssets;
  error?: string;
}

/** Simplified asset reference for internal use (bridge between API and renderer) */
export interface MarbleWorldAsset {
  id: string;
  /** SPZ URL to load into SparkJS SplatMesh (use 500k or full_res) */
  spzUrl: string;
  /** GLB collider mesh URL for physics (optional) */
  colliderUrl?: string;
  /** Whether this is a mock asset (no real SPZ file) */
  isMock: boolean;
  metadata: {
    prompt: string;
    caption?: string;
    created: string;
  };
}

export interface WorldLabsConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}
