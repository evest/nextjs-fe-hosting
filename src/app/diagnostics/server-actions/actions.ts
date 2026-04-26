"use server";

export type EchoState = {
  count: number;
  lastEcho: string | null;
  lastAt: string | null;
};

export async function echoAction(prev: EchoState, formData: FormData): Promise<EchoState> {
  const message = String(formData.get("message") ?? "");
  return {
    count: prev.count + 1,
    lastEcho: message,
    lastAt: new Date().toISOString(),
  };
}
