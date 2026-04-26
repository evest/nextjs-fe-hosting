"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { echoAction, type EchoState } from "./actions";

const INITIAL: EchoState = { count: 0, lastEcho: null, lastAt: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Submit"}
    </button>
  );
}

export function EchoForm() {
  const [state, action] = useActionState(echoAction, INITIAL);
  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2 items-center">
        <input
          name="message"
          type="text"
          defaultValue="hello"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <SubmitButton />
      </form>
      <div className="text-sm font-mono text-gray-700 space-y-1">
        <div>Submissions: {state.count}</div>
        <div>Last echo: {state.lastEcho ?? "(none)"}</div>
        <div>Last at: {state.lastAt ?? "(none)"}</div>
      </div>
    </div>
  );
}
