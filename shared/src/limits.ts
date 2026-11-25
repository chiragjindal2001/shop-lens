/**
 * Plain constants, with no zod import. Client code that only needs a number imports this file directly
 * (`@shared/limits`), so it does not pull the whole validation library into the page.
 */
export const MAX_MESSAGE_LENGTH = 2000;

/** Password rule: shared by the server's validation, the form's inline errors and the helper text. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
