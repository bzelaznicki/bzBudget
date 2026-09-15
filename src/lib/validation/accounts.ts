import { z } from "zod";

/** Shared by the add-account form's counter and the server action that enforces it. */
export const ACCOUNT_NAME_MAX_LENGTH = 40;

export const accountIdSchema = z.uuid();
