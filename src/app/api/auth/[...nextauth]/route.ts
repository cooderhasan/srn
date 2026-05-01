import { handlers } from "@/lib/auth";

// Force Node.js runtime to avoid Edge Runtime crypto issues with bcryptjs
export const runtime = "nodejs";

export const { GET, POST } = handlers;
