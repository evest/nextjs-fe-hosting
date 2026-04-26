import { version as reactVersion } from "react";
import { version as reactDomVersion } from "react-dom";
import { TestPage, Evidence, Row } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { MODULE_LOAD_TIME, PROCESS_ID, formatStamp, ageHuman, requestNow } from "../_lib/shared";

export const dynamic = "force-dynamic";

export default function RuntimePage() {
  const now = requestNow();
  const uptimeSec = typeof process.uptime === "function" ? process.uptime() : null;
  const mem = typeof process.memoryUsage === "function" ? process.memoryUsage() : null;

  return (
    <TestPage
      title="Runtime info"
      category="A. Environment"
      whatItTests={
        <p>
          Reports the Node.js, Next.js and React versions plus container
          process state (uptime, memory, hostname).
        </p>
      }
      whyItMatters={
        <p>
          Establishes a baseline before trusting any other test. If Node is
          older than expected, or NEXT_RUNTIME is unexpected, downstream
          results may be misleading.
        </p>
      }
      howToInterpret={
        <p>
          Reload the page — uptime should grow linearly. PROCESS_ID
          changing across reloads means you are hitting different container
          instances behind a load balancer.
        </p>
      }
    >
      <Evidence title="Versions">
        <Row label="Node.js" value={process.version} />
        <Row label="React" value={reactVersion} />
        <Row label="React DOM" value={reactDomVersion} />
        <Row label="NEXT_RUNTIME" value={process.env.NEXT_RUNTIME ?? "(undefined → nodejs)"} />
        <Row label="Platform / arch" value={`${process.platform} / ${process.arch}`} />
      </Evidence>

      <Evidence title="Process">
        <Row label="Hostname" value={process.env.HOSTNAME ?? "(unset)"} />
        <Row label="PID" value={process.pid} />
        <Row label="PROCESS_ID (random per start)" value={PROCESS_ID} />
        <Row label="Module load time" value={`${formatStamp(MODULE_LOAD_TIME)}  (${ageHuman(MODULE_LOAD_TIME, now)} ago)`} />
        <Row label="Process uptime" value={uptimeSec !== null ? `${uptimeSec.toFixed(1)} s` : "n/a"} />
        <Row label="Heap used" value={mem ? `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB` : "n/a"} />
        <Row label="RSS" value={mem ? `${(mem.rss / 1024 / 1024).toFixed(1)} MB` : "n/a"} />
        <Row label="Request time" value={formatStamp(now)} />
      </Evidence>

      <div>
        <Verdict value="manual" note="Read values above; reload to confirm uptime increases." />
      </div>
    </TestPage>
  );
}
