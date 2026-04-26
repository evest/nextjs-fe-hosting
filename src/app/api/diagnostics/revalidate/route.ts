import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST() {
  // Next 16's revalidateTag requires a cacheLife profile as the second arg.
  revalidateTag("diagnostics-on-demand", "max");
  return NextResponse.json({
    ok: true,
    revalidated: "diagnostics-on-demand",
    at: new Date().toISOString(),
  });
}
