export const env: Record<string, unknown> = {};

export class pipeline {
  static async create() { return null; }
}

export class AutoModel {
  static async from_pretrained() { return null; }
}

export class AutoProcessor {
  static async from_pretrained() { return null; }
}

export class RawImage {
  static async fromURL() { return null; }
  static async read() { return null; }
}

export default { env, pipeline, AutoModel, AutoProcessor, RawImage };
