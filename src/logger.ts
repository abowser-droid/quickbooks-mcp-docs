import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "../logs");
const LOG_FILE = join(LOG_DIR, "quickbooks-mcp.log");

// Ensure logs directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  intuit_tid?: string;
  endpoint?: string;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry) + "\n";
}

export function log(level: LogLevel, message: string, meta?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const formatted = formatLogEntry(entry);

  // Write to file
  try {
    appendFileSync(LOG_FILE, formatted);
  } catch (err) {
    console.error("Failed to write to log file:", err);
  }

  // Also output to stderr for MCP
  console.error(`[${entry.level}] ${message}${meta?.intuit_tid ? ` [intuit_tid: ${meta.intuit_tid}]` : ""}`);
}

export function logInfo(message: string, meta?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>): void {
  log("INFO", message, meta);
}

export function logWarn(message: string, meta?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>): void {
  log("WARN", message, meta);
}

export function logError(message: string, meta?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>): void {
  log("ERROR", message, meta);
}

export function logDebug(message: string, meta?: Partial<Omit<LogEntry, "timestamp" | "level" | "message">>): void {
  log("DEBUG", message, meta);
}

export function getLogFilePath(): string {
  return LOG_FILE;
}
