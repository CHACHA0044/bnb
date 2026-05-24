import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
});

/**
 * Middleware for logging requests.
 */
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    const isError = res.statusCode >= 400;
    const isMutation = req.method !== "GET" && req.method !== "OPTIONS";
    const isSlow = duration > 1000;

    // Only log important requests to prevent terminal spam
    if (isError || isMutation || isSlow) {
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        clientId: req.headers["x-client-id"],
      };

      if (isError) logger.error(logData, "API Error");
      else if (isSlow) logger.warn(logData, "Slow API response");
      else logger.info(logData, "API Request");
    }
  });
  next();
}
