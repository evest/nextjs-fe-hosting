'use client';

import Script from "next/script";

export default function CommunicationInjector() {
  return (
    <Script
      src={`${process.env.OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js`}
      strategy="beforeInteractive"
      id="optimizely-communication-injector"
    />
  );
}
