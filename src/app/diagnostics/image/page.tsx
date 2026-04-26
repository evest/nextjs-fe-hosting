import Image from "next/image";
import { TestPage, Evidence } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { ImageProbe } from "./ImageProbe";

export const dynamic = "force-static";

const SRC = "https://placehold.co/800x600.png?text=Diagnostics";

export default function ImagePage() {
  return (
    <TestPage
      title="next/image optimization"
      category="F. Other"
      whatItTests={
        <p>
          A <code>&lt;Image&gt;</code> with a remote source. The optimizer
          endpoint <code>/_next/image?url=…&amp;w=640&amp;q=75</code> should
          return a transcoded WebP/AVIF, not the original PNG. The probe
          below fetches it directly and reports the response headers.
        </p>
      }
      whyItMatters={
        <p>
          Image optimization needs <code>sharp</code> to be installed and
          a writable cache directory in the container. On a misconfigured
          host you get the original asset bytes back (or a 500), defeating
          the bandwidth and Core Web Vitals benefits.
        </p>
      }
      howToInterpret={
        <p>
          Pass: probe returns <code>200</code> with a Content-Type of{" "}
          <code>image/webp</code> or <code>image/avif</code>. Warn: returns
          <code>image/png</code> (passthrough — no transcoding). Fail:
          non-200.
        </p>
      }
    >
      <Evidence title="Rendered with next/image">
        <Image src={SRC} alt="diagnostic" width={400} height={300} unoptimized={false} />
      </Evidence>
      <Evidence title="Direct probe of /_next/image">
        <ImageProbe />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if Content-Type is image/webp or image/avif." />
      </div>
    </TestPage>
  );
}
