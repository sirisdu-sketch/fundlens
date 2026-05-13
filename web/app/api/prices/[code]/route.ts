import { NextRequest, NextResponse } from "next/server";
import { getPrices } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  try {
    const range = req.nextUrl.searchParams.get("range") || "1y";
    const prices = getPrices(params.code, range);
    return NextResponse.json({ code: params.code, range, prices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
