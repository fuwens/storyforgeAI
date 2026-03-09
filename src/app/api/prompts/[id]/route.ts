import { NextResponse } from "next/server";

import { updatePromptVariant } from "@/lib/db/store";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    imagePrompt?: string;
    videoPrompt?: string;
    negativePrompt?: string;
  };

  const updated = await updatePromptVariant(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
