export type LogContext = Record<string, unknown>;

export type Logger = {
  error: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
};

function writeLog(
  destination: Pick<NodeJS.WriteStream, "write">,
  level: "error" | "info" | "warn",
  message: string,
  context: LogContext = {},
) {
  destination.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    })}\n`,
  );
}

export function createLogger(): Logger {
  return {
    error: (message, context) =>
      writeLog(process.stderr, "error", message, context),
    info: (message, context) =>
      writeLog(process.stdout, "info", message, context),
    warn: (message, context) =>
      writeLog(process.stderr, "warn", message, context),
  };
}
