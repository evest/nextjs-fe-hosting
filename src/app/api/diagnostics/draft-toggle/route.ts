import { NextResponse } from "next/server";
import { draftMode } from "next/headers";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const dm = await draftMode();
  if (action === "enable") {
    dm.enable();
    return NextResponse.json({ ok: true, action: "enable", isEnabled: dm.isEnabled });
  }
  if (action === "disable") {
    dm.disable();
    return NextResponse.json({ ok: true, action: "disable", isEnabled: dm.isEnabled });
  }
  return NextResponse.json({ ok: false, error: "missing ?action=enable|disable" }, { status: 400 });
}
