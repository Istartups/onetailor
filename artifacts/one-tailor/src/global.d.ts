declare module "@xenova/transformers" {
  export const env: Record<string, unknown>;
  export function pipeline(task: string, model?: string, options?: Record<string, unknown>): Promise<unknown>;
  export const AutoModel: unknown;
  export const AutoProcessor: unknown;
  export const RawImage: { fromURL(url: string): Promise<unknown>; [key: string]: unknown };
}

declare module "@ffmpeg/ffmpeg" {
  export class FFmpeg {
    load(options?: Record<string, unknown>): Promise<void>;
    exec(args: string[]): Promise<number>;
    writeFile(name: string, data: Uint8Array | string): Promise<void>;
    readFile(name: string): Promise<Uint8Array>;
    listDir(path: string): Promise<{ name: string; isDir: boolean }[]>;
    deleteFile(name: string): Promise<void>;
    terminate(): void;
    on(event: string, callback: (data: unknown) => void): void;
  }
}

declare module "@ffmpeg/util" {
  export function fetchFile(input: string | URL | File | Blob): Promise<Uint8Array>;
  export function toBlobURL(url: string, mimeType: string): Promise<string>;
}
