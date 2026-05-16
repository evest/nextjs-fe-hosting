'use client';

import { useState } from 'react';

type Props = {
  text: string;
  label?: string;
};

export default function CopyButton({ text, label = 'Copy' }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function onClick() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 1500);
  }

  const display =
    status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono hover:bg-gray-50"
    >
      {display}
    </button>
  );
}
