type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function requestIdentity(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}

export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 2_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: "Too many requests. Please wait before trying again." },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds),
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": String(result.remaining),
      },
    },
  );
}

export function rejectOversizedJson(request: Request, maxBytes = 16_384) {
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length > maxBytes;
}
