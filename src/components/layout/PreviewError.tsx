import type { ReactElement } from 'react';

type GraphQLError = {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  extensions?: Record<string, unknown>;
};

type GraphQLErrorResponse = {
  errors: GraphQLError[];
  status?: unknown;
  request?: {
    query?: string;
    variables?: unknown;
  };
};

type Props = {
  error: unknown;
  params: Record<string, string | string[] | undefined>;
};

function isGraphQLErrorResponse(err: unknown): err is GraphQLErrorResponse {
  return (
    err !== null &&
    typeof err === 'object' &&
    'errors' in err &&
    Array.isArray((err as GraphQLErrorResponse).errors)
  );
}

function getErrorLocations(error: unknown): Set<number> {
  const locations = new Set<number>();
  if (isGraphQLErrorResponse(error)) {
    error.errors.forEach((err) => {
      err.locations?.forEach((loc) => locations.add(loc.line));
    });
  }
  return locations;
}

function formatQueryWithErrors(
  query: string,
  errorLocations: Set<number>
): ReactElement[] {
  return query.split('\n').map((line, index) => {
    const lineNumber = index + 1;
    const hasError = errorLocations.has(lineNumber);
    return (
      <div
        key={index}
        className={`whitespace-pre ${hasError ? 'bg-red-100' : ''}`}
      >
        <span
          className={`inline-block w-12 text-right pr-3 select-none ${hasError ? 'text-red-700 font-bold' : 'text-gray-800'}`}
        >
          {lineNumber}
        </span>
        <span className={hasError ? 'text-red-700' : 'text-gray-800'}>
          {line}
        </span>
      </div>
    );
  });
}

export default function PreviewError({ error, params }: Props) {
  const isGraphQL = isGraphQLErrorResponse(error);
  const errorLocations = getErrorLocations(error);
  const hasStatus =
    error !== null && typeof error === 'object' && 'status' in error;
  const request = isGraphQL ? error.request : undefined;

  return (
    <div className="bg-red-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Preview Error</h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Error Message:</h2>
          <p className="text-gray-700 font-mono bg-gray-100 p-3 rounded">
            {error instanceof Error
              ? error.message
              : 'Unknown error occurred'}
          </p>
        </div>

        {isGraphQL && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">GraphQL Errors:</h2>
            <div className="space-y-3">
              {error.errors.map((err, index) => (
                <div key={index} className="bg-gray-100 p-3 rounded">
                  <p className="font-mono text-sm text-red-700">
                    {err.message}
                  </p>
                  {err.locations && err.locations.length > 0 && (
                    <div className="mt-2 text-xs text-gray-800">
                      <span className="font-semibold">
                        Location{err.locations.length > 1 ? 's' : ''}:
                      </span>{' '}
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

        {hasStatus && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">HTTP Status:</h2>
            <p className="text-gray-700 font-mono bg-gray-100 p-3 rounded">
              {String((error as { status: unknown }).status)}
            </p>
          </div>
        )}

        {request?.query && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">GraphQL Query:</h2>
            <details className="bg-gray-100 rounded">
              <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:bg-gray-200">
                Click to view query{' '}
                {errorLocations.size > 0 && (
                  <span className="text-red-600">
                    ({errorLocations.size} error
                    {errorLocations.size > 1 ? 's' : ''} highlighted)
                  </span>
                )}
              </summary>
              <div className="text-xs p-3 overflow-auto max-h-96 border-t border-gray-300 font-mono">
                {formatQueryWithErrors(request.query, errorLocations)}
              </div>
            </details>
          </div>
        )}

        {request?.variables != null && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Query Variables:</h2>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(request.variables, null, 2)}
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
            <li>
              Verify that content types are synced with{' '}
              <code className="bg-gray-200 px-1 rounded">
                npm run cms:push-config
              </code>
            </li>
            <li>
              Check that the content exists in the CMS and is published
            </li>
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