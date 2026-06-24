import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Hyeong (DBhyeong) — Quartz 4 설정
 * 이 파일은 Quartz 클론의 루트(quartz/quartz.config.ts)에 덮어쓰기 하세요.
 * 사이트 주소: https://dbhyeong.github.io
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Hyeong · 데이터·마케팅·개발 제너럴리스트",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null, // 나중에 Plausible/GA 붙이려면 { provider: "google", tagId: "G-..." }
    locale: "ko-KR",
    baseUrl: "dbhyeong.github.io",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Sans KR",
        body: "Noto Sans KR",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#ffffff", // 배경: 깨끗한 흰색
          lightgray: "#e6e8eb", // 경계선
          gray: "#9ca3af", // 보조 텍스트·그래프
          darkgray: "#2e3338", // 본문 텍스트 (진하게 → 가독성↑)
          dark: "#1a1a1a", // 제목·강조 (near-black)
          secondary: "#2f6fb3", // 링크·강조 (깔끔한 블루)
          tertiary: "#5a86b8", // hover
          highlight: "rgba(47, 111, 179, 0.1)", // 인라인 링크 배경
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#1a1b1e", // 배경 (살짝 들어올려 대비↑)
          lightgray: "#393b40",
          gray: "#6b7178",
          darkgray: "#dadde1", // 본문 텍스트
          dark: "#f0f1f2", // 제목
          secondary: "#8fb3d9",
          tertiary: "#6f97c0",
          highlight: "rgba(143, 179, 217, 0.12)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({ priority: ["frontmatter", "git", "filesystem"] }),
      Plugin.SyntaxHighlighting({
        theme: { light: "github-light", dark: "github-dark" },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()], // draft: true 글(_post-template 등)은 빌드 제외
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(), // /tags/<태그> 페이지 자동 생성 (블로그 태그 분류)
      Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
