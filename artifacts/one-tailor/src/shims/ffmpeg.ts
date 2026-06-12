export class FFmpeg {
  loaded = false;
  async load() {}
  async exec() { return 0; }
  on() {}
  FS() {}
  writeFile() {}
  readFile() { return new Uint8Array(); }
  deleteFile() {}
}
export default FFmpeg;
