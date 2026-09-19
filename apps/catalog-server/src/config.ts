import "dotenv/config";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535, received: ${value}`,
    );
  }

  return port;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  return {
    host: environment.HOST ?? DEFAULT_HOST,
    port: parsePort(environment.PORT),
  };
}
