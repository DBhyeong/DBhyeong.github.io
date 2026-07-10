// 공유 버튼 클라이언트 동작. Quartz SPA 라우팅의 "nav" 이벤트마다 재바인딩.
// 상단·하단 두 개의 .share-buttons 바를 모두 연결하고, 클릭 시 GTM/GA4 이벤트를 남긴다.
// ⚠️ 카카오톡: dev.kakao.com JavaScript 키 + 앱 > 플랫폼 Web 사이트 도메인(https://dbhyeong.github.io) 등록 필요.
const KAKAO_JS_KEY = "d63a7259ccdb8205867dc221e3509d71"

function kakaoReady(): boolean {
  const K = (window as any).Kakao
  return !!(K && K.isInitialized && K.isInitialized())
}

function loadKakao(cb: () => void) {
  const K = (window as any).Kakao
  if (kakaoReady()) return cb()
  if (K) {
    try {
      K.init(KAKAO_JS_KEY)
    } catch (_) {}
    return cb()
  }
  const s = document.createElement("script")
  s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
  s.crossOrigin = "anonymous"
  s.onload = () => {
    try {
      ;(window as any).Kakao.init(KAKAO_JS_KEY)
    } catch (_) {}
    cb()
  }
  document.head.appendChild(s)
}

function metaContent(sel: string): string {
  const el = document.querySelector(sel) as HTMLMetaElement | null
  return el?.content ?? ""
}

function openShare(u: string) {
  window.open(u, "_blank", "noopener,noreferrer,width=600,height=640")
}

function flash(btn: HTMLElement, msg: string) {
  const orig = btn.textContent
  btn.textContent = msg
  setTimeout(() => {
    btn.textContent = orig
  }, 1200)
}

async function copyLink(u: string, btn: HTMLElement) {
  try {
    await navigator.clipboard.writeText(u)
    flash(btn, "✅ 복사됨!")
  } catch (_) {
    window.prompt("아래 링크를 복사하세요:", u)
  }
}

// GTM dataLayer 이벤트 — GA4 추천 share 이벤트 형태(method/content_type/item_id)
function trackShare(method: string | null, url: string, title: string) {
  try {
    ;(window as any).dataLayer = (window as any).dataLayer || []
    ;(window as any).dataLayer.push({
      event: "share",
      method: method,
      content_type: "article",
      item_id: url,
      page_title: title,
    })
  } catch (_) {}
}

document.addEventListener("nav", () => {
  const bars = document.querySelectorAll<HTMLElement>(".share-buttons")
  if (!bars.length) return

  bars.forEach((bar) => {
    bar.querySelectorAll<HTMLElement>("[data-share]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const type = btn.getAttribute("data-share")
        const u = location.href
        const t = bar.getAttribute("data-title") || document.title
        const desc = metaContent('meta[name="description"]')

        trackShare(type, u, t)

        switch (type) {
          case "native":
            if ((navigator as any).share) {
              try {
                await (navigator as any).share({ title: t, url: u })
              } catch (_) {}
            } else {
              await copyLink(u, btn)
            }
            break
          case "copy":
            await copyLink(u, btn)
            break
          case "kakao":
            if (!KAKAO_JS_KEY || KAKAO_JS_KEY.indexOf("여기에") !== -1) {
              window.alert(
                "카카오톡 공유는 앱키 설정이 필요해요. (모바일은 '공유' 버튼으로 카카오톡 공유가 됩니다)",
              )
              return
            }
            loadKakao(() => {
              const img =
                metaContent('meta[property="og:image"]') ||
                location.origin + "/images/profile.jpg"
              ;(window as any).Kakao.Share.sendDefault({
                objectType: "feed",
                content: {
                  title: t,
                  description: desc,
                  imageUrl: img,
                  link: { mobileWebUrl: u, webUrl: u },
                },
                buttons: [{ title: "글 보기", link: { mobileWebUrl: u, webUrl: u } }],
              })
            })
            break
          case "x":
            openShare(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
            )
            break
          case "facebook":
            openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`)
            break
          case "linkedin":
            openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`)
            break
          case "threads":
            openShare(`https://www.threads.net/intent/post?text=${encodeURIComponent(t + " " + u)}`)
            break
        }
      })
    })
  })
})
