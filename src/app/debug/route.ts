import { NextResponse } from "next/server";
import { getGraphGatewayUrl } from "@/lib/config";

function maskValue(value: string | undefined): string {
  if (!value) return "(not set)";
  if (value.length <= 8) return "***" + value.slice(-2);
  return value.slice(0, 4) + "***" + value.slice(-4);
}

export async function GET() {
  const envVars = {
    OPTIMIZELY_CMS_URL: process.env.OPTIMIZELY_CMS_URL || "(not set)",
    OPTIMIZELY_GRAPH_GATEWAY_RAW: process.env.OPTIMIZELY_GRAPH_GATEWAY || "(not set)",
    OPTIMIZELY_GRAPH_GATEWAY_RESOLVED: getGraphGatewayUrl(),
    OPTIMIZELY_GRAPH_SINGLE_KEY: maskValue(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY),
    OPTIMIZELY_CMS_CLIENT_ID: maskValue(process.env.OPTIMIZELY_CMS_CLIENT_ID),
    OPTIMIZELY_CMS_CLIENT_SECRET: maskValue(process.env.OPTIMIZELY_CMS_CLIENT_SECRET),
    OPTI_PROJECT_ID: process.env.OPTI_PROJECT_ID || "(not set)",
    OPTI_TARGET_ENV: process.env.OPTI_TARGET_ENV || "(not set)",
    NODE_ENV: process.env.NODE_ENV || "(not set)",
  };

  // Log to server console for debugging
  console.log("=== Environment Variables Debug ===");
  console.log(JSON.stringify(envVars, null, 2));
  console.log("===================================");

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: envVars,
  });
}
