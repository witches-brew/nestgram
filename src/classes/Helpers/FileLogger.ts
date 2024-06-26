import { IUpdate } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileLogger {
  nestgramInfoDirPath: string = path.resolve(process.cwd(), 'nestgram');
  logsFilePath: string = path.resolve(this.nestgramInfoDirPath, 'logs.md');

  constructor(private readonly limit: number) {
    if (process.env.DISABLE_LOGS) return;

    this.setupLogsFile();
  }

  private async setupLogsFile(): Promise<void> {
    try {
      await fs.access(this.logsFilePath);
    } catch (e: any) {
      try {
        await fs.access(this.nestgramInfoDirPath);
      } catch (e: any) {
        await fs.mkdir(path.resolve(this.nestgramInfoDirPath));
      }

      await fs.writeFile(this.logsFilePath, '');
    }
  }

  async saveLog(update: IUpdate): Promise<void> {
    if (process.env.DISABLE_LOGS) return;

    const date: string = new Date().toISOString();
    const oldLogsFileText: string = (await fs.readFile(this.logsFilePath)).toString();
    const updateText = JSON.stringify(update, null, 2);

    const titleLines: string[] = oldLogsFileText
      .split('\n')
      .filter((line: string): boolean => line.startsWith('#'));

    let newLogsFileText: string;
    newLogsFileText = `# ${update.update_id} (${date})`;
    newLogsFileText += `\n\n${updateText}`;
    if (titleLines.length < this.limit) newLogsFileText += `\n\n${oldLogsFileText || ''}`;

    await fs.writeFile(this.logsFilePath, newLogsFileText);
  }
}
