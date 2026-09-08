import { NextResponse } from "next/server";
import { requireAuth, HttpError } from "@/lib/auth";

// Rute ini SELALU bergantung pada cookie sesi milik masing-masing user,
// jadi tidak boleh pernah di-cache/di-generate statis oleh Next.js. Tanpa
// baris ini, Next mencoba mem-prerender rute ini saat build, cookies()
// melempar sinyal internal "dynamic server usage", dan try/catch di bawah
// ikut menangkapnya sebagai error aplikasi biasa (bukan error sungguhan).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();

    return NextResponse.json({
      success: true,
      data: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Me error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
