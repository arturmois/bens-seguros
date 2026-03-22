/** Minimal logger interface compatible with both Pino Logger and FastifyBaseLogger */
export interface AppLogger {
  info(msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  error(msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
  warn(msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  debug(msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  fatal(msg: string): void;
  fatal(obj: Record<string, unknown>, msg: string): void;
}
