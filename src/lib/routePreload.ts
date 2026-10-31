// Page loaders shared by the router and sign-in, so /world can be fetched before it is opened.
export const loadWorld = () => import('@/pages/WorldTest');
let worldPending: ReturnType<typeof loadWorld> | null = null;
/** Starts downloading /world once; safe to call repeatedly. */
export const preloadWorld = () => { worldPending ??= loadWorld().catch(error => { worldPending = null; throw error; }); return worldPending; };
