// The application uses real FastAPI services and validated browser storage.
import { createHttpClient } from "./http-client";
export const api = createHttpClient();
export type * from "./types";
