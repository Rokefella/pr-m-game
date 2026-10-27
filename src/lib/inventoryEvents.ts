/** Mutations announce only persisted success; open inventory views re-read their own user. */
export const INVENTORY_CHANGED = 'praem:inventory-changed';
export const inventoryChanged = () => window.dispatchEvent(new Event(INVENTORY_CHANGED));