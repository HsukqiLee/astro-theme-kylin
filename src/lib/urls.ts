// Public browser resources and API share the accelerated origin in production.
export const resourceOrigin = import.meta.env.PUBLIC_RESOURCE_ORIGIN || '';
export const resourceUrl = (path: string) => `${resourceOrigin}${path}`;
