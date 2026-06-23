// schema.org JSON-LD 생성 유틸 (AEO/GEO)
// Article / WebSite / Person / BreadcrumbList / FAQPage 를 fileData 기반으로 생성.
// 어떤 에러가 나도 빌드를 깨지 않도록 전부 try/catch로 감싼다.

const SITE = (cfg: any): string => `https://${cfg?.baseUrl ?? "example.com"}`

const PERSON = (cfg: any) => ({
  "@type": "Person",
  name: "김형민 (Kim Hyeongmin)",
  url: `${SITE(cfg)}/about`,
  jobTitle: "데이터 분석가 / 디지털 마케터",
  sameAs: ["https://github.com/DBhyeong", "https://www.youtube.com/@istp-hyeong"],
})

function textOf(node: any): string {
  if (!node) return ""
  if (node.type === "text") return node.value ?? ""
  if (Array.isArray(node.children)) return node.children.map(textOf).join("")
  return ""
}

function pageUrl(cfg: any, slug?: string): string {
  if (!slug || slug === "index") return `${SITE(cfg)}/`
  return `${SITE(cfg)}/${slug}`
}

const CRUMB_LABELS: Record<string, string> = {
  blog: "블로그",
  reading: "읽을거리",
  portfolio: "포트폴리오",
  tags: "태그",
  about: "About",
  links: "Links",
}

function buildBreadcrumb(cfg: any, slug?: string): object | null {
  if (!slug || slug === "index") return null
  const parts = slug.split("/").filter((p) => p && p !== "index")
  if (parts.length === 0) return null
  const items: object[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE(cfg)}/` },
  ]
  let acc = ""
  parts.forEach((p, i) => {
    acc += `/${p}`
    const name = CRUMB_LABELS[p] ?? p.replaceAll("-", " ")
    items.push({ "@type": "ListItem", position: i + 2, name, item: `${SITE(cfg)}${acc}` })
  })
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }
}

function buildFaq(tree: any): object | null {
  try {
    const kids = tree?.children ?? []
    const pairs: object[] = []
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i]
      if (el?.type === "element" && el.tagName === "h2") {
        const q = textOf(el).trim()
        if (q.endsWith("?")) {
          let ans = ""
          for (let j = i + 1; j < kids.length; j++) {
            const n = kids[j]
            if (n?.type === "element" && /^h[1-6]$/.test(n.tagName)) break
            if (n?.type === "element" && (n.tagName === "p" || n.tagName === "ul" || n.tagName === "ol")) {
              ans += (ans ? " " : "") + textOf(n).trim()
            }
          }
          if (ans) pairs.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } })
        }
      }
    }
    if (pairs.length >= 2) return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: pairs }
  } catch {
    /* noop */
  }
  return null
}

function buildArticleOrSite(fileData: any, cfg: any): object {
  const slug = fileData?.slug
  const title = fileData?.frontmatter?.title ?? cfg?.pageTitle ?? ""
  const desc =
    fileData?.frontmatter?.description ?? (typeof fileData?.description === "string" ? fileData.description.trim() : "")
  if (!slug || slug === "index") {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: cfg?.pageTitle ?? title,
      url: `${SITE(cfg)}/`,
      description: desc,
      inLanguage: "ko-KR",
      author: PERSON(cfg),
      publisher: PERSON(cfg),
    }
  }
  const dates = fileData?.dates
  const pub = dates?.published ?? dates?.created
  const mod = dates?.modified ?? pub
  const tags = fileData?.frontmatter?.tags
  const art: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: desc,
    inLanguage: "ko-KR",
    author: PERSON(cfg),
    publisher: PERSON(cfg),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl(cfg, slug) },
  }
  try {
    if (pub) art.datePublished = new Date(pub).toISOString()
    if (mod) art.dateModified = new Date(mod).toISOString()
  } catch {
    /* noop */
  }
  if (Array.isArray(tags) && tags.length) art.keywords = tags.join(", ")
  return art
}

export function getCanonicalUrl(cfg: any, slug?: string): string {
  return pageUrl(cfg, slug)
}

export function buildJsonLd(fileData: any, cfg: any, tree: any): object[] {
  const out: object[] = []
  try {
    out.push(buildArticleOrSite(fileData, cfg))
    const bc = buildBreadcrumb(cfg, fileData?.slug)
    if (bc) out.push(bc)
    const faq = buildFaq(tree)
    if (faq) out.push(faq)
  } catch {
    /* noop */
  }
  return out
}

export function jsonLdToString(obj: object): string {
  // </script> 깨짐 방지를 위해 < 를 이스케이프
  return JSON.stringify(obj).replace(/</g, "\\u003c")
}
