import { cookies } from "next/headers";
import { CAPTCHA_COOKIE, createCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const { svg, cookieValue } = createCaptcha();

  const jar = await cookies();
  jar.set(CAPTCHA_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
