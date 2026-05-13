import { NextResponse } from "next/server";
import { listFunds } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const funds = listFunds();
    return NextResponse.json({ funds });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
