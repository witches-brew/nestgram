import * as editJsonFile from 'edit-json-file';
import * as fs from 'fs/promises';

import * as path from 'path';

export class MediaCache {
  nestgramInfoDirPath: string = path.resolve(process.cwd(), 'nestgram');
  mediaKeeperFilePath: string = path.resolve(this.nestgramInfoDirPath, 'media.json');
  file: editJsonFile.JsonEditor;

  constructor() {
    if (process.env.DISABLE_LOGS) return;

    this.getJSONFile();
  }

  private async getJSONFile(): Promise<void> {
    try {
      await fs.access(this.mediaKeeperFilePath);
    } catch (e: any) {
      try {
        await fs.access(this.nestgramInfoDirPath);
      } catch (e: any) {
        await fs.mkdir(path.resolve(this.nestgramInfoDirPath));
      }

      await fs.writeFile(this.mediaKeeperFilePath, '{}');
    }

    this.file = editJsonFile(this.mediaKeeperFilePath, { autosave: true });
  }

  saveMediaFileId(path: string, fileId: string): void {
    if (process.env.DISABLE_LOGS) return;

    this.file.set(path, fileId);
  }

  getMediaFileId(path: string): string | undefined {
    if (process.env.DISABLE_LOGS) return undefined;

    // @ts-ignore
    return this.file.data[path];
  }
}

export const mediaCache = new MediaCache();
