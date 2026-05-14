import { NextRequest, NextResponse } from "next/server";
import { getIndicators } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  try {
    const range = req.nextUrl.searchParams.get("range") || "1y";
    const indicators = await getIndicators(params.code, range);
    return NextResponse.json({ code: params.code, range, indicators });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
