import { NextResponse } from "next/server";
import { getLatestClose, getLatestIndicator } from "@/lib/queries";
import { generateSignal } from "@/lib/signals";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  try {
    const [latest, close] = await Promise.all([
      getLatestIndicator(params.code),
      getLatestClose(params.code),
    ]);
    if (!latest || close === null) {
      return NextResponse.json(
        { error: "no data for this fund" },
        { status: 404 },
      );
    }
    const signal = generateSignal(latest, close);
    return NextResponse.json({
      code: params.code,
      date: latest.date,
      close,
      latest,
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
