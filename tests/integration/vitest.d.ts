import "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    PG_URL: string;
    CH_URL: string;
    APP_URL: string;
  }
}
