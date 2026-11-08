# Environments

The site runs in three Optimizely Frontend Hosting environments. **Each one
has its own CMS instance**, with its own content, API keys and Graph key. This
page covers how the environments fit together, how to point your local setup
at one of them, how to set up a new CMS instance, and how deployments work.

| Name | Public host | Frontend Hosting | Deployed by | Indexed by search engines |
|---|---|---|---|---|
| `dev` | [dev.contentgurus.no](https://dev.contentgurus.no) | Test1 | Every push to `master` | No |
| `stage` | [test.contentgurus.no](https://test.contentgurus.no) | Test2 | Manually | No |
| `prod` | [www.contentgurus.no](https://www.contentgurus.no) | Production | Manually | Yes |

## Local configuration: `.env` + `.env.<APP_ENV>`

Local settings are split the way .NET splits `appsettings.json` and
`appsettings.{Environment}.json`:

| File | Contains |
|---|---|
| `.env` | Settings shared by all environments, plus `APP_ENV`, which picks the current environment |
| `.env.dev`, `.env.stage`, `.env.prod` | Settings for one environment's CMS and site |

[`scripts/env.mjs`](../scripts/env.mjs) merges them. A value set in your
shell wins over `.env.<APP_ENV>`, which wins over `.env`. `npm run dev` and
all `cms:*` scripts run through it, and each run starts with a banner that
shows the environment and CMS it's using:

```bash
npm run cms:diff                    # uses APP_ENV from .env
APP_ENV=prod npm run cms:diff       # one run against prod, without editing .env
npm run env -- <any command>        # run anything else with the environment loaded
```

To get started, copy [`.env.template`](../.env.template) to `.env` and to
`.env.<name>` for each environment you work with, then move each value to the
file it belongs in:

| Variable | Where | Notes |
|---|---|---|
| `APP_ENV` | `.env` | `dev`, `stage` or `prod` |
| `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET` | `.env.<env>` | CMS → Settings → API Keys. Must not be in `.env` (see below) |
| `OPTIMIZELY_GRAPH_SINGLE_KEY`, `OPTIMIZELY_CMS_URL` | `.env.<env>` | Differ per CMS instance |
| `NEXT_PUBLIC_SITE_URL` | `.env.<env>` | The environment's public origin |
| `CONTACT_REF_KEY` | `.env.<env>` | Separate key per environment; empty on `dev` on purpose |
| `APP_IN_*` | `.env.<env>` | Application Insights query access, see [observability](observability.md) |
| `OPTIMIZELY_GRAPH_GATEWAY`, `OPTIMIZELY_GRAPH_PATH` | `.env` | Same everywhere |
| `OPTI_PROJECT_ID`, `OPTI_CLIENT_KEY`, `OPTI_CLIENT_SECRET` | `.env` | Deployment credentials; one set covers all three environments |
| `DIAGNOSTICS_USER`, `DIAGNOSTICS_PASSWORD`, `OTEL_EXPORTER_OTLP_ENDPOINT` | `.env` | Local dev server only |

### Why the CMS credentials can't go in `.env`

The CMS CLI has no notion of environments. It pushes to whichever CMS
instance `OPTIMIZELY_CMS_CLIENT_ID` belongs to. All instances share the same
API endpoint, and `cms:login` only checks the credentials, it stores nothing.
If the credentials were in `.env`, running the CLI directly
(`npx optimizely-cms-cli config push …`) would push to whatever `.env`
happened to point at. With the credentials only in `.env.<env>`, that command
fails with "Credentials not provided" instead. The wrapper refuses to run if
it finds them in `.env`.

Other safeguards:

- `cms:push-config` asks you to type `prod` before pushing to production.
  Without a terminal, it refuses unless `CONFIRM_PROD=1` is set.
- The wrapper lists any empty values in `.env.<env>`, so a half-configured
  environment is obvious.
- `.gitignore` and `.zipignore` exclude every `.env*` file except
  `.env.template`.

Don't use the names `.env.development`, `.env.production`, `.env.test` or
`.env.local`. Next.js loads those automatically, so a local `next build` would
silently pick up production keys. The wrapper rejects them as `APP_ENV`
values.

## Setting up a CMS instance

A new environment's CMS starts empty. To get it to the same state as the
others:

1. **Content model.** Set `APP_ENV` to the environment, then run
   `npm run cms:diff` and `npm run cms:push-config`. This includes the CMS's
   standard types (`BlankExperience`, `BlankSection` and the three media types,
   defined in
   [`BuiltInTypes.ts`](../src/content-types/BuiltInTypes.ts)). Every new
   instance should have them, but editors can delete them like any other
   type, and our Test1 instance turned out to have none. Without `ImageMedia`,
   images can't be uploaded.
2. **Languages.** Enable English, Norwegian, Swedish and Danish under
   **Settings → Languages**. The config doesn't create locales.
3. **Content.** Import the content package under **Settings → Import Data**
   (see [Getting started](../README.md#getting-started)), or create content by
   hand.
4. **Application.** Under **Settings → Applications**, create an application
   with the start page and the environment's public host, for example
   `dev.contentgurus.no`, plus `localhost:3000` if you run the dev server
   against this CMS. This is done once per instance in the UI. Applications
   could be defined in `optimizely.config.mjs`, but the CLI would then
   overwrite the host list on every push, in whichever instance it's pointed
   at.
5. **Index.** Run a full Graph index so the content is available through
   Graph.

## Frontend Hosting app settings

Each environment needs these under **App Settings** in the PaaS Portal:

| Setting | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://dev.contentgurus.no`, `https://test.contentgurus.no` or `https://www.contentgurus.no`. **Inlined at build time**, so it must be set before the deployment that needs it |
| `CONTACT_REF_KEY` | Not set on Test1 |
| `DIAGNOSTICS_USER`, `DIAGNOSTICS_PASSWORD` | Optional; without them `/diagnostics` returns 404 |

The platform provides the rest, and some of it can't be overridden:

- **`OPTIMIZELY_SITE_HOSTNAME`** is the environment's internal hostname
  (`*.dxcloud.episerver.net`), not the public domain. Trying to set it in the
  portal fails with "Secret name … has already existed". The publish webhook
  purges the CDN for both this hostname and the host in
  `NEXT_PUBLIC_SITE_URL` (`purgeHostnames()` in
  [`cdn-cache.ts`](../src/lib/cdn-cache.ts)).
- **`OPTIMIZELY_GRAPH_CALLBACK_APIKEY`**, the Graph keys, Redis and the
  Application Insights connection string are also provided per environment.
- **`OPTIMIZELY_ENVIRONMENT`** holds the environment name (`Test1`, `Test2`,
  `Production`), read at runtime.

## Search indexing

Only Production is indexed. [`src/proxy.ts`](../src/proxy.ts) checks
`OPTIMIZELY_ENVIRONMENT` on every request. Every other environment, and local
dev, serves a `robots.txt` with `Disallow: /` and sends
`X-Robots-Tag: noindex, nofollow` on every page, so dev and test never compete
with www in search results. Because the check runs at request time, it
follows the environment serving the request, not the one that built the
package. `/diagnostics/env` shows the value.

## Deploying

### From your machine

```bash
npm run deploy-test1    # dev.contentgurus.no
npm run deploy-test2    # test.contentgurus.no
npm run deploy-prod     # www.contentgurus.no
```

These run [`opticloud`](https://www.npmjs.com/package/@kunalshetye/opticloud),
which packages **your working folder**, not git, so uncommitted changes get
deployed too. Credentials come from the `OPTI_*` variables in `.env`, or from
the OS keychain after `npx opticloud auth:login`. **`.zipignore` controls
what goes into the package. Keep `.env` and `.env.*` in it.**

### From GitHub Actions

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) deploys
every push to `master` to Test1. Pushes that only change docs, Markdown or
Lighthouse results are skipped. To deploy elsewhere, open the repository's
**Actions** tab, choose **Deploy → Run workflow** and pick an environment.
Production runs go through the `production` GitHub environment, which only
allows `master`. It has no required reviewers, because this is a demo site;
add them if a production deploy should need approval (the run then waits for
**Review deployments → Approve and deploy**).

**The deployment API calls production `Production1`, not `Production`.**
`--target=Production` gets HTTP 403 "Access is denied for source environment
or target environment Production", after the package has already been
uploaded. `deploy-prod` and the workflow use `Production1`; the workflow's
menu still says *Production*. The test environments are `Test1` and
`Test2` as expected.

The workflow runs one deployment at a time across all environments, so a
manual run waits for a push-triggered deploy to finish. A deploy from your
machine doesn't know about that queue.

Setting up a fork (all under the repository's **Settings**):

1. **Secrets and variables → Actions → New repository secret:** add
   `OPTI_PROJECT_ID`, `OPTI_CLIENT_KEY` and `OPTI_CLIENT_SECRET` from PaaS
   Portal → API. Add them as repository secrets, not environment secrets.
2. **Environments:** create `test`, which needs no rules, and `production`.
   For `production`, restrict **Deployment branches and tags** to
   `master`, and add **Required reviewers** if deploys should need approval.

The workflow installs `libsecret` before running opticloud. opticloud loads
its keychain library at startup even when the credentials come from
environment variables, and without `libsecret` it crashes on the Ubuntu
runner.
