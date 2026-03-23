import http from "k6/http";
import { check, sleep } from "k6";

const SITE_ID =
  __ENV.SITE_ID || "dfdd5933-1f58-4701-b3eb-d4be6b48ccd3";
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CH_URL = __ENV.CH_URL || "http://localhost:8123";

export const options = {
  stages: [
    { duration: "20s", target: 100 },
    { duration: "30s", target: 500 },
    { duration: "60s", target: 1000 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{type:pageview}": ["p(99)<100"],
    "http_req_duration{type:event}": ["p(99)<100"],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  const res = http.get(
    `${CH_URL}/?query=SELECT+count()+FROM+analytics.events+WHERE+toStartOfMonth(timestamp)%3DtoStartOfMonth(now())&database=analytics`
  );
  const initialCount = parseInt(res.body.trim()) || 0;
  console.log(`Initial ClickHouse event count: ${initialCount}`);
  return { initialCount };
}

export default function () {
  const isEvent = Math.random() < 0.3;
  const headers = { "Content-Type": "application/json" };

  if (isEvent) {
    const res = http.post(
      `${BASE_URL}/api/track/event`,
      JSON.stringify({
        siteId: SITE_ID,
        name: "load_test_event",
        sessionId: `s${__VU}-${__ITER}`,
      }),
      { headers, tags: { type: "event" } }
    );
    check(res, {
      "event 2xx": (r) => r.status >= 200 && r.status < 300,
    });
  } else {
    const pages = ["/", "/pricing", "/features", "/blog", "/docs"];
    const res = http.post(
      `${BASE_URL}/api/track`,
      JSON.stringify({
        siteId: SITE_ID,
        pathname: pages[__VU % pages.length],
        sessionId: `s${__VU}-${__ITER}`,
      }),
      { headers, tags: { type: "pageview" } }
    );
    check(res, {
      "pageview 200": (r) => r.status === 200,
    });
  }
}

export function teardown(data) {
  // Allow async ClickHouse inserts to flush
  sleep(5);

  const res = http.get(
    `${CH_URL}/?query=SELECT+count()+FROM+analytics.events+WHERE+toStartOfMonth(timestamp)%3DtoStartOfMonth(now())&database=analytics`
  );
  const finalCount = parseInt(res.body.trim()) || 0;
  const delta = finalCount - data.initialCount;

  check(res, {
    "ClickHouse recorded new events": () => finalCount > data.initialCount,
  });

  console.log(
    `ClickHouse event count: ${data.initialCount} → ${finalCount} (+${delta})`
  );
}
