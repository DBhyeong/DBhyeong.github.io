import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// 공유 버튼을 노출할 "글" 페이지 판별 — 블로그·읽을거리·일상 (섹션 인덱스 제외)
const isArticlePage = (slug: string | undefined): boolean => {
  const s = slug ?? ""
  if (s.endsWith("index")) return false
  return s.startsWith("blog/") || s.startsWith("reading/") || s.startsWith("daily/")
}

// 탐색기: 폴더별로 묶고 기본 접힘 + 폴더명 한글 라벨 → 깔끔하게
const explorer = Component.Explorer({
  title: "탐색기",
  folderClickBehavior: "collapse",
  folderDefaultState: "collapsed",
  useSavedState: false, // 항상 접힌 상태로 시작(예전 펼침 상태 무시)
  mapFn: (node) => {
    const labels: Record<string, string> = {
      blog: "🧪 기술 블로그",
      reading: "📚 읽을거리",
      daily: "🌙 일상",
      portfolio: "💼 포트폴리오",
    }
    if (node.isFolder && labels[node.slugSegment]) {
      node.displayName = labels[node.slugSegment]
    }
  },
})

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    // 글 본문 끝에 공유 버튼 — 블로그·읽을거리·일상 글에 노출
    Component.ConditionalRender({
      component: Component.ShareButtons(),
      condition: (page) => isArticlePage(page.fileData.slug),
    }),
    // 홈(index)에만 "최근 글" 노출 — 블로그+일상 새 글을 자동 표시
    Component.ConditionalRender({
      component: Component.RecentNotes({
        title: "🆕 최근 글",
        limit: 6,
        filter: (f) => {
          const s = f.slug ?? ""
          if (s.endsWith("index")) return false // 섹션 인덱스 제외
          return s.startsWith("blog/") || s.startsWith("daily/")
        },
        linkToMore: "blog/" as any,
      }),
      condition: (page) => page.fileData.slug === "index",
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
    // 본문 상단(제목·태그 아래)에도 공유 버튼 — 글 페이지에만 (라벨 짧게)
    Component.ConditionalRender({
      component: Component.ShareButtons({ label: "공유" }),
      condition: (page) => isArticlePage(page.fileData.slug),
    }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    explorer,
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    explorer,
  ],
  right: [],
}
