import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CreatureIdentity } from '../creatures/generator.js';

export type AppConfig = {
  selectedRepoPaths: string[] | null;
  setupSkipped: boolean;
  creatureIdentities: Record<string, CreatureIdentity>;
};

const defaultConfig: AppConfig = {
  selectedRepoPaths: null,
  setupSkipped: false,
  creatureIdentities: {},
};

export function configPath(): string {
  return path.join(os.homedir(), '.claude-managerie', 'config.json');
}

export async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(configPath(), 'utf8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return { ...defaultConfig };
  }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  const file = configPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
}
