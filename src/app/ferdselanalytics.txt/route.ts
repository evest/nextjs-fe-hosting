// Ferdsel Analytics navigation beacon endpoint: a static text file. One request per in-app
// navigation lands in the edge logs. The dotted path keeps it outside the next-intl middleware.
// No `export const dynamic` here: cacheComponents rejects it and prerenders this handler anyway.
export { GET } from '@ferdselanalytics/next/route';
