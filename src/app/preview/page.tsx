import { GraphClient, type PreviewParams } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { PreviewComponent } from '@optimizely/cms-sdk/react/client';
import { getGraphGatewayUrl } from '@/lib/config';
import Script from 'next/script';
import type { ReactElement } from 'react';


type Props = {
  /*
  searchParams: Promise<{
    key?: string;
    loc?: string;
    ver?: string;
    ctx?: string;
    preview_token?: string;
  }>;
  */
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: Props) {
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: getGraphGatewayUrl(),
  });

  let response;
  let error: unknown = null;

  try {
    response = await client.getPreviewContent(
      (await searchParams) as PreviewParams
    );
  } catch (err: unknown) {
    error = err;
  }

  if (error) {
    // Handle GraphQL errors
    const isGraphQLError = error && typeof error === 'object' && 'errors' in error;
    const params = await searchParams;

    // Extract error locations for highlighting
    const errorLocations = new Set<number>();
    if (isGraphQLError && Array.isArray((error as { errors: unknown[] }).errors)) {
      (error as { errors: Array<{ locations?: Array<{ line: number; column: number }> }> }).errors.forEach(err => {
        err.locations?.forEach(loc => {
          errorLocations.add(loc.line);
        });
      });
    }

    const formatQueryWithErrors = (query: string): ReactElement[] => {
      const lines = query.split('\n');
      return lines.map((line, index) => {
        const lineNumber = index + 1;
        const hasError = errorLocations.has(lineNumber);
        return (
          <div key={index} className={`whitespace-pre ${hasError ? 'bg-red-100' : ''}`}>
            <span className={`inline-block w-12 text-right pr-3 select-none ${hasError ? 'text-red-700 font-bold' : 'text-gray-800'}`}>
              {lineNumber}
            </span>
            <span className={hasError ? 'text-red-700' : 'text-gray-800'}>{line}</span>
          </div>
        );
      });
    };

    return (
      <div className="bg-red-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Preview Error</h1>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Error Message:</h2>
            <p className="text-gray-700 font-mono bg-gray-100 p-3 rounded">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>

          {isGraphQLError && Array.isArray((error as { errors: unknown[] }).errors) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">GraphQL Errors:</h2>
              <div className="space-y-3">
                {(error as { errors: Array<{ message: string; locations?: Array<{ line: number; column: number }>; extensions?: Record<string, unknown> }> }).errors.map((err, index) => (
                  <div key={index} className="bg-gray-100 p-3 rounded">
                    <p className="font-mono text-sm text-red-700">{err.message}</p>
                    {err.locations && err.locations.length > 0 && (
                      <div className="mt-2 text-xs text-gray-800">
                        <span className="font-semibold">Location{err.locations.length > 1 ? 's' : ''}:</span>{' '}
                        {err.locations.map((loc, i) => (
                          <span key={i} className="font-mono">
                            Line {loc.line}, Column {loc.column}
                            {i < err.locations!.length - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {err.extensions && (
                      <pre className="mt-2 text-xs text-gray-800 overflow-auto">
                        {JSON.stringify(err.extensions, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && typeof error === 'object' && 'status' in error && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">HTTP Status:</h2>
              <p className="text-gray-700 font-mono bg-gray-100 p-3 rounded">
                {String((error as { status: unknown }).status)}
              </p>
            </div>
          )}

          {error && typeof error === 'object' && 'request' in error &&
           typeof (error as { request: unknown }).request === 'object' &&
           (error as { request: { query?: unknown } }).request &&
           'query' in (error as { request: { query?: unknown } }).request && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">GraphQL Query:</h2>
              <details className="bg-gray-100 rounded">
                <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:bg-gray-200">
                  Click to view query {errorLocations.size > 0 && <span className="text-red-600">({errorLocations.size} error{errorLocations.size > 1 ? 's' : ''} highlighted)</span>}
                </summary>
                <div className="text-xs p-3 overflow-auto max-h-96 border-t border-gray-300 font-mono">
                  {formatQueryWithErrors(String((error as { request: { query: unknown } }).request.query))}
                </div>
              </details>
            </div>
          )}

          {error && typeof error === 'object' && 'request' in error &&
           typeof (error as { request: unknown }).request === 'object' &&
           (error as { request: { variables?: unknown } }).request &&
           'variables' in (error as { request: { variables?: unknown } }).request && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Query Variables:</h2>
              <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify((error as { request: { variables: unknown } }).request.variables, null, 2)}
              </pre>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Preview Parameters:</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(params, null, 2)}
            </pre>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-2">Troubleshooting:</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Verify that content types are synced with <code className="bg-gray-200 px-1 rounded">npm run cms:push-config</code></li>
              <li>Check that the content exists in the CMS and is published</li>
              <li>Ensure environment variables are correctly configured</li>
              <li>Verify the preview token is valid</li>
            </ul>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer font-semibold text-gray-600 hover:text-gray-800">
              Full Error Details
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Script
        src={`${process.env.OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      ></Script>
      <PreviewComponent />
      <OptimizelyComponent opti={response} />
    </div>
  );
}
