const PORT = process.env.PORT || 3000;
const HEALTH_URL = `http://localhost:${PORT}/api/health`;

try {
  const response = await fetch(HEALTH_URL);
  if (!response.ok) {
    console.error(`[Healthcheck] Failed with status: ${response.status}`);
    process.exit(1);
  }

  const data = await response.json();
  // @ts-ignore
  if (data?.status !== "online") {
    console.error(
      `[Healthcheck] API returned invalid status: ${JSON.stringify(data)}`,
    );
    process.exit(1);
  }

  console.log("[Healthcheck] Passed");
  process.exit(0);
} catch (error) {
  console.error(`[Healthcheck] Request failed: ${error}`);
  process.exit(1);
}
