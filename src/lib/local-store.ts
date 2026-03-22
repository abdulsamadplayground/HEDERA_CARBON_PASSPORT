import * as fs from "fs";
import * as path from "path";

const CONFIG_DIR = path.resolve(process.cwd(), "config");
const DEFAULT_CONFIG_FILE = "platform-config.json";

/**
 * Ensures the config directory exists.
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Reads a JSON file from the config directory.
 * Returns an empty object if the file does not exist.
 */
export function readStore(filename: string = DEFAULT_CONFIG_FILE): Record<string, unknown> {
  ensureConfigDir();
  const filePath = path.join(CONFIG_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Writes a full JSON object to a file in the config directory.
 */
export function writeStore(data: Record<string, unknown>, filename: string = DEFAULT_CONFIG_FILE): void {
  ensureConfigDir();
  const filePath = path.join(CONFIG_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Gets a single value from the store by key.
 */
export function getValue(key: string, filename: string = DEFAULT_CONFIG_FILE): unknown | undefined {
  const store = readStore(filename);
  return store[key];
}

/**
 * Sets a single key-value pair in the store, merging with existing data.
 */
export function setValue(key: string, value: unknown, filename: string = DEFAULT_CONFIG_FILE): void {
  const store = readStore(filename);
  store[key] = value;
  writeStore(store, filename);
}
