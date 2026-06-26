import remarkGfm from "remark-gfm"
import smartypants from "remark-smartypants"
import remarkCjkFriendly from "remark-cjk-friendly"
import { QuartzTransformerPlugin } from "../types"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"

export interface Options {
  enableSmartyPants: boolean
  linkHeadings: boolean
}

const defaultOptions: Options = {
  enableSmartyPants: true,
  linkHeadings: true,
}

export const GitHubFlavoredMarkdown: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "GitHubFlavoredMarkdown",
    markdownPlugins() {
      // remarkCjkFriendly: 한글 등 CJK 문자가 강조(**/*) 닫는 기호 옆에 붙을 때
      // CommonMark flanking 규칙 때문에 **"인용"**조사 / **용어(eng)**조사 가
      // 그대로 출력되던 문제를 해결한다.
      return opts.enableSmartyPants
        ? [remarkGfm, remarkCjkFriendly, smartypants]
        : [remarkGfm, remarkCjkFriendly]
    },
    htmlPlugins() {
      if (opts.linkHeadings) {
        return [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: {
                role: "anchor",
                ariaHidden: true,
                tabIndex: -1,
                "data-no-popover": true,
              },
              content: {
                type: "element",
                tagName: "svg",
                properties: {
                  width: 18,
                  height: 18,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                },
                children: [
                  {
                    type: "element",
                    tagName: "path",
                    properties: {
                      d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
                    },
                    children: [],
                  },
                  {
                    type: "element",
                    tagName: "path",
                    properties: {
                      d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
                    },
                    children: [],
                  },
                ],
              },
            },
          ],
        ]
      } else {
        return []
      }
    },
  }
}
