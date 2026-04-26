import { TestPage, Evidence } from "../_components/TestPage";
import { Verdict } from "../_components/Verdict";
import { EchoForm } from "./EchoForm";

export const dynamic = "force-dynamic";

export default function ServerActionsPage() {
  return (
    <TestPage
      title="Server Actions"
      category="D. React 19"
      whatItTests={
        <p>
          A form whose <code>action</code> is a function declared with{" "}
          <code>&apos;use server&apos;</code>. React posts the form to a
          generated endpoint, the server runs the action, and React
          patches the result back into the page using{" "}
          <code>useActionState</code>.
        </p>
      }
      whyItMatters={
        <p>
          Server actions remove the boilerplate of writing a separate
          API route + client fetcher for every form. Requires the host
          to forward POSTs with the form-data action ID header
          (<code>Next-Action</code>) and support the React Flight
          response format.
        </p>
      }
      howToInterpret={
        <p>
          Type something, click submit. The submission count must
          increment, and your input must be echoed back. Open DevTools
          → Network and look for a POST to <code>/diagnostics/server-actions</code>{" "}
          with a <code>Next-Action</code> request header. If submitting
          fails, server actions are not supported here.
        </p>
      }
    >
      <Evidence title="Echo form (action runs on the server)">
        <EchoForm />
      </Evidence>

      <div>
        <Verdict value="manual" note="Pass if the count increments and your message is echoed back." />
      </div>
    </TestPage>
  );
}
