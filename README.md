This is a [Next.js](https://nextjs.org) project using the [Optimizely Content JS SDK](https://github.com/episerver/content-js-sdk), running locally and deployable to the [Optimizely Frontend Hosting](https://docs.developers.optimizely.com/content-management-system/v1.0.0-CMS-SaaS/docs/host-a-front-end-with-optimizely).

## Getting Started

1. Copy the `.env.template` file to `.env` and add the necessary values from the CMS and optionally your frontend hosting (PaaS Portal).

2. Push types
```bash
npm run cms:push-config
```

3. Do a full Graph Indexing in Settings in the CMS

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

5. Add a new application in Settings > Applications

Add localhost:3000 as the host, use all for languages. You should now have a working start page (a Blank Experience)
## Learn More

To learn more about Optimizely Content JS SDK:
* [Documentation](https://github.com/episerver/content-js-sdk)
* [Sample projects](https://github.com/episerver/content-js-sdk/tree/main/samples)
* [Sample Astro project](https://github.com/kunalshetye/opti-astro)
* [Mosey Bank demo](https://github.com/episerver/cms-saas-vercel-demo/)

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy to Optimizely Frontend Hosting

The easiest way to deploy is using the `deploy.ps1` PowerShell script in the root of the project. It will package up the necessary files and deploy using the Optimizely Deployment API.

Make sure all the environment variables are set.