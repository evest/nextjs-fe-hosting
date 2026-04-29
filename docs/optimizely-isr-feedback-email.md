# Email draft — executive summary for the Optimizely team

> Paste-ready. Attach `optimizely-isr-feedback.md` for the full detail.

---

**Subject:** Feedback: Frontend Hosting ISR docs — implementation notes from a live Test2 deploy

Hi team,

We've finished implementing the official ISR + Graph webhooks pattern
from the Frontend Hosting docs against a live DXP Test2 environment. It
works — origin caching, shared Redis, webhook invalidation, CDN purge
code path, all running. But following the doc verbatim produced enough
build/runtime issues that we think other customers will hit them too,
so I wrote up a structured review for your team. Attached.

The single biggest ask, if nothing else lands:

**Please clarify whether the supported `cacheComponents` value is
`true` or `false`.** The two are structurally incompatible: the §1
reference code (`export const revalidate = 60` + `export const dynamic
= "force-static"`) is forbidden under `cacheComponents: true`. The
Next.js docs are explicit that `cacheComponents` + `'use cache'` is
the **current model** and the segment-config-export approach is
**the previous model** — the [Next.js Caching guide](https://nextjs.org/docs/app/getting-started/caching)
is now the Cache Components guide, and the older approach lives at
[Caching and Revalidating (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components).
Vercel themselves state in [discussion #84894](https://github.com/vercel/next.js/discussions/84894)
that *"in Next.js 16, the dynamic route segment config has been replaced
by the new static/dynamic rendering model"*.

Customers building a new Next.js 16 app will reach for `cacheComponents: true`
because that's where the docs point — and then discover the §1 reference
code doesn't work. A one-sentence note at the top of the guide saying
"this assumes `cacheComponents: false`" (or `true`, with §1 revised
accordingly) would save the next customer most of the work this took us.

Other issues worth highlighting (full detail in the attachment):

1. **Build-time Graph latency from the DXP build container is
   intermittently >50s**, which exceeds Next.js's hard-coded
   `'use cache'` fill ceiling and fails the build with
   `USE_CACHE_TIMEOUT`. We worked around this by abandoning
   build-time prerender entirely and relying on ISR-only. Worth
   recommending this in the docs explicitly, since the §1 example
   leads customers down the prerender path.

2. **404s silently return 200 OK** under `cacheComponents: true` if
   `notFound()` is thrown from inside a `<Suspense>` boundary
   (because the static shell flushes first under PPR and commits
   the status). With `Cache-Control: s-maxage=2592000` from the
   origin, every typo'd URL gets cached on Cloudflare for 30 days.
   This is a real correctness bug for any customer using the
   recommended Next 16 primitives. We fixed it by calling
   `notFound()` from `generateMetadata` (which runs before the
   response is committed).

3. **`OPTIMIZELY_SITE_HOSTNAME` is the internal Azure hostname, not
   the public one — silently breaks CDN purge.** On Test2 the var is
   set to `epsa05head3wy8zt002.dxcloud.episerver.net` while our
   actual public hostname is `fetest2.optimize.li`. The §3.2 reference
   webhook code passes `OPTIMIZELY_SITE_HOSTNAME` to the CDN purge
   API, so we're purging an internal hostname Cloudflare has never
   heard of. The purge succeeds (the API doesn't validate against
   your zone) but invalidates nothing. Once HTML caching is enabled
   at the edge (issue 5 below), publish→invalidate is silently
   broken. §5's description of the var ("Public hostname of the site,
   e.g. mysite.example.com") doesn't match the provisioned value.
   Either populate it correctly, or split into separate
   internal/public vars.

4. **`createCluster` against Azure Managed Redis floods build logs**
   with `Cannot read properties of undefined (reading 'replicas')`
   errors — known node-redis bug
   ([#2704](https://github.com/redis/node-redis/issues/2704)). The
   handler's `withFallback` wrapper catches them, so runtime is fine,
   but ~20 lines of error spam per build worker makes it look like
   Redis is broken. **Notably, errors disappear on subsequent
   deploys from the same commit** — likely first-deploy infrastructure
   provisioning. A "what to expect on first deploy" section in the
   docs would save customers a lot of time.

5. **Cloudflare's default Cache Level doesn't cache HTML** — only
   static asset extensions. Even with the doc's `s-maxage=2592000`
   origin headers, `cf-cache-status: DYNAMIC` for HTML, and the §4
   CDN purge has nothing to purge on the edge. Fixable with a
   Cloudflare Cache Rule but the doc doesn't mention it.

6. **`OPTIMIZELY_CLOUDPLATFORM_API_URL` and
   `OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID`** are referenced in
   §4's purge code but absent from the §5 platform-set env-var
   table. We've now confirmed they ARE provisioned, just undocumented.
   One-line fix in §5.

The attached document has more items, repro details where
applicable, and a "what ended up working for us" section that may be
useful as a reference configuration for the next customer asking how
to make `cacheComponents: true` work on DXP.

Implementation repo (public): https://github.com/evest/nextjs-fe-hosting

Happy to get on a call if any of this is faster discussed live.

Best,
Steve
