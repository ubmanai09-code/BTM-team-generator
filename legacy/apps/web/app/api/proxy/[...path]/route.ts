import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_ORIGIN = process.env.API_INTERNAL_ORIGIN ?? "http://localhost:4000";

const proxy = async (
  request: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> => {
  const incomingUrl = new URL(request.url);
  const targetPath = params.path.join("/");
  const targetUrl = `${API_ORIGIN}/${targetPath}${incomingUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstreamResponse = await fetch(targetUrl, init);

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders
  });
};

export const GET = (request: NextRequest, context: { params: { path: string[] } }) =>
  proxy(request, context.params);

export const POST = (request: NextRequest, context: { params: { path: string[] } }) =>
  proxy(request, context.params);

export const PUT = (request: NextRequest, context: { params: { path: string[] } }) =>
  proxy(request, context.params);

export const PATCH = (request: NextRequest, context: { params: { path: string[] } }) =>
  proxy(request, context.params);

export const DELETE = (request: NextRequest, context: { params: { path: string[] } }) =>
  proxy(request, context.params);
