import type { Thing, WithContext } from 'schema-dts';

type JsonLdData = WithContext<Thing> | WithContext<Thing>[];

// JSON.stringify embedded in a <script> tag can break out of the tag if the
// data contains "</script>" or other angle-bracket sequences. Escaping every
// "<" to its unicode form keeps the JSON valid while preventing tag breakout.
// Standard mitigation; same approach react-schemaorg uses.
function serialize(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
