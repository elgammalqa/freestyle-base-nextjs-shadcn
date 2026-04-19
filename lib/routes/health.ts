export async function healthCheck() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
