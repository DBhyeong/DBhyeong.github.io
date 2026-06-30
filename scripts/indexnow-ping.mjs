#!/usr/bin/env node
/*
 * IndexNow 자동 핑 (CI/로컬 공용) — Bing·Naver·Yandex·Seznam 즉시 색인 알림.
 * 키는 비밀이 아님(사이트 루트에 공개 호스팅): https://dbhyeong.github.io/<KEY>.txt
 * 의존성 0 (Node 18+ 내장 fetch). 구글은 IndexNow 미사용(자연 크롤링/Indexing API 별도).
 *
 * URL 결정 우선순위:
 *   1) 인자로 URL을 주면 그 URL만 제출:   node scripts/indexnow-ping.mjs <url> [url...]
 *   2) 환경변수 BEFORE/AFTER(push 전후 SHA)가 있으면 그 사이 변경된 content/*.md만 → URL 제출
 *   3) 둘 다 없으면(수동 dispatch 등) sitemap.xml 전체 제출
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const HOST = "dbhyeong.github.io";
const BASE = `https://${HOST}`;
const KEY = "b2270c507f26bd8e478959936e90ec4d";
const KEY_LOCATION = `${BASE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow"; // 참여 검색엔진에 공유됨

function slugToUrl(file) {
  // content/blog/foo.md -> https://dbhyeong.github.io/blog/foo ; content/index.md -> /
  let s = file.replace(/^content\//, "").replace(/\.md$/, "");
  s = s.replace(/(^|\/)index$/, "$1"); // index -> 디렉터리
  s = s.replace(/\/$/, "");
  return s ? `${BASE}/${s}` : `${BASE}/`;
}

function isDraft(file) {
  try {
    const head = readFileSync(file, "utf8").split(/\n/).slice(0, 20).join("\n");
    return /^draft:\s*true\s*$/im.test(head);
  } catch {
    return false;
  }
}

async function fromSitemap() {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { "User-Agent": "indexnow-ping" } });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function changedFromGit(before, after) {
  if (!before || !after || /^0+$/.test(before)) return null; // diff 불가 → 폴백
  let out;
  try {
    out = execSync(`git diff --name-only --diff-filter=ACMR ${before} ${after} -- content`, {
      encoding: "utf8",
    });
  } catch {
    return null;
  }
  const files = out.split(/\r?\n/).filter((f) => f.endsWith(".md"));
  const urls = files.filter((f) => existsSync(f) && !isDraft(f)).map(slugToUrl);
  return [...new Set(urls)];
}

const args = process.argv.slice(2);
let urls;
if (args.length) {
  urls = args;
} else if (process.env.BEFORE || process.env.AFTER) {
  urls = changedFromGit(process.env.BEFORE, process.env.AFTER);
  if (urls === null) urls = await fromSitemap();
} else {
  urls = await fromSitemap();
}

if (!urls || !urls.length) {
  console.log("IndexNow: 제출할 변경 URL 없음 → 건너뜀.");
  process.exit(0);
}

// 1) IndexNow (Bing·Yandex·Seznam 등). 키는 공개.
const inRes = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
});
const inTxt = await inRes.text();
const inOk = inRes.status === 200 || inRes.status === 202;
console.log(`IndexNow 제출: ${urls.length}개 → HTTP ${inRes.status} ${inRes.statusText}`);
urls.forEach((u) => console.log("  -", u));
if (inTxt) console.log("  응답:", inTxt);

// 2) Bing URL Submission API (BING_API_KEY 있을 때만 — CI 시크릿). IndexNow와 별개의 직접 제출.
let bingOk = true;
if (process.env.BING_API_KEY) {
  const SITE = process.env.BING_SITE_URL || BASE;
  const bRes = await fetch(
    `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${process.env.BING_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ siteUrl: SITE, urlList: urls }),
    },
  );
  const bTxt = await bRes.text();
  bingOk = bRes.ok && !/ErrorCode/i.test(bTxt);
  console.log(`Bing SubmitUrlBatch: ${urls.length}개 → HTTP ${bRes.status} ${bTxt || ""}`);
} else {
  console.log("Bing: BING_API_KEY 미설정 → 건너뜀(IndexNow가 Bing 커버).");
}

process.exitCode = inOk && bingOk ? 0 : 1;
