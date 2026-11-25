/** Assistant tools that change an order. Only after one of these does the orders list need to be reloaded. */
export const ORDER_CHANGING_TOOLS: ReadonlySet<string> = new Set(['cancel_order', 'create_return_request']);

export const changesOrders = (toolsUsed: readonly string[]) => toolsUsed.some((t) => ORDER_CHANGING_TOOLS.has(t));
