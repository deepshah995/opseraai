import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const getBackendUrl = () => {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
};

async function handleProxy(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path ? params.path.join("/") : "";
  const search = req.nextUrl.search;
  const targetUrl = `${getBackendUrl()}/api/${path}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Avoid host/connection conflicts
    const lower = key.toLowerCase();
    if (lower !== "host" && lower !== "connection" && lower !== "content-length") {
      headers.set(key, value);
    }
  });

  const isBodyAllowed = !["GET", "HEAD"].includes(req.method);
  const body = isBodyAllowed ? await req.arrayBuffer() : undefined;

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore
      duplex: "half",
    });

    const resHeaders = new Headers();
    res.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== "content-encoding" && lower !== "content-length") {
        resHeaders.set(key, val);
      }
    });

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, err);
    return NextResponse.json(
      { error: "Backend proxy connection failure", detail: err?.message || String(err) },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;
