import fs from 'fs';
import path from 'path';

interface CacheData {
  timestamp: number;
  data: any;
}

interface CacheConfig {
  ttl: number; // Time to live in seconds
}

class Cache {
  private cacheDir: string;
  private defaultConfig: CacheConfig = {
    ttl: 3600, // 1 hour default TTL
  };

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async get(key: string): Promise<any | null> {
    try {
      const filePath = this.getCacheFilePath(key);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const cacheContent = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CacheData;
      const now = Date.now();

      if (now - cacheContent.timestamp > this.defaultConfig.ttl * 1000) {
        // Cache expired
        fs.unlinkSync(filePath);
        return null;
      }

      return cacheContent.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  async set(key: string, data: any): Promise<void> {
    try {
      const cacheContent: CacheData = {
        timestamp: Date.now(),
        data,
      };

      fs.writeFileSync(
        this.getCacheFilePath(key),
        JSON.stringify(cacheContent),
        'utf-8'
      );
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

export const cache = new Cache(); 