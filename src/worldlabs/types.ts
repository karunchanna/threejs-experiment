/** World Labs Marble API type definitions */

export interface MarbleWorldConfig {
  prompt: string;
  style?: 'realistic' | 'stylized' | 'fantasy';
  resolution?: 'low' | 'medium' | 'high';
  seed?: number;
}

export interface MarbleWorldAsset {
  id: string;
  url: string;
  format: 'splat' | 'ply' | 'glb';
  metadata: {
    prompt: string;
    created: string;
    resolution: [number, number, number];
    pointCount?: number;
  };
}

export interface MarbleWorldResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  assets?: MarbleWorldAsset[];
  error?: string;
}

export interface WorldLabsConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}
