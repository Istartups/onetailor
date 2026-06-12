import { env, pipeline, AutoModel, AutoProcessor, RawImage } from '@xenova/transformers';

// Configure environment for browser
env.allowLocalModels = false;
env.useBrowserCache = true;
// Point explicitly to HuggingFace
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

const MODELS = {
  tiny: {
    id: 'Xenova/modnet', // Much smaller (~25MB) and unrestricted
    sizeMB: 25,
    version: '1.0.0'
  },
  pro: {
    id: 'Xenova/rmbg-1.4', // Try fallback or higher quality if available
    sizeMB: 176,
    version: '1.0.0'
  }
};

export type ModelType = 'tiny' | 'pro';

export interface ModelStatus {
  isLoaded: boolean;
  isDownloading: boolean;
  progress: number;
  error: string | null;
  isCached: boolean;
}

export class ModelManager {
  private static instance: ModelManager;
  private segmenter: any = null;
  private currentModelType: ModelType | null = null;

  private constructor() {}

  static getInstance() {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async checkCache(type: ModelType): Promise<boolean> {
    if (!('caches' in window)) return false;
    try {
      const cacheNames = await caches.keys();
      if (!cacheNames.includes('transformers-cache')) return false;
      
      const cache = await caches.open('transformers-cache');
      const keys = await cache.keys();
      // Check for the model ID and the specific files we need
      const modelId = MODELS[type].id;
      return keys.some(request => request.url.includes(modelId));
    } catch (e) {
      console.error('Error checking cache:', e);
      return false;
    }
  }

  async loadModel(type: ModelType, onProgress?: (progress: number) => void) {
    // If already loaded the same model, return it
    if (this.segmenter && this.currentModelType === type) return this.segmenter;

    const tryLoad = async (modelId: string) => {
      return await pipeline('image-segmentation', modelId, {
        revision: 'main',
        progress_callback: (data: any) => {
          if (onProgress && data.status === 'progress') {
            onProgress(data.progress);
          }
        }
      });
    };

    try {
      // Clear current model to free memory if switching
      if (this.segmenter) {
        this.segmenter = null;
        this.currentModelType = null;
      }

      this.segmenter = await tryLoad(MODELS[type].id);
      this.currentModelType = type;
      return this.segmenter;
    } catch (error: any) {
      console.error(`Failed to load model ${type}:`, error);
      
      // Fallback strategy: if 'pro' fails, try 'tiny'
      if (type === 'pro') {
        console.log('Attempting fallback to tiny model...');
        try {
          this.segmenter = await tryLoad(MODELS.tiny.id);
          this.currentModelType = 'tiny';
          return this.segmenter;
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
        }
      }

      let message = 'Background removal model unavailable.';
      const errorStr = error.toString();
      
      if (errorStr.includes('401') || errorStr.includes('Unauthorized')) {
        message = 'Model access issue. This usually happens with strict firewall/network settings. Please try on a different connection (e.g. mobile data).';
      } else if (errorStr.includes('404')) {
        message = 'Model files not found on server.';
      } else if (!navigator.onLine) {
        message = 'Network connection lost. Please connect to the internet.';
      }
      
      throw new Error(message);
    }
  }

  async clearCache() {
    if ('caches' in window) {
      await caches.delete('transformers-cache');
    }
  }

  async removeBackground(imageSource: string | HTMLCanvasElement | Blob, type: ModelType = 'tiny'): Promise<string> {
    if (!this.segmenter || this.currentModelType !== type) {
      await this.loadModel(type);
    }

    const img = await RawImage.fromURL(
      typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource as Blob)
    );
    
    const output = await this.segmenter(img);
    
    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const imageData = new ImageData(output.data, output.width, output.height);
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL('image/png');
  }

  getModelInfo(type: ModelType) {
    return MODELS[type];
  }
}
