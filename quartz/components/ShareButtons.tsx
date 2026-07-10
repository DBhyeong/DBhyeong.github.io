// @ts-ignore
import shareScript from "./scripts/shareButtons.inline"
import styles from "./styles/shareButtons.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface Options {
  label: string
}

const defaultOptions: Options = {
  label: "이 글이 도움이 됐다면 공유해 주세요",
}

export default ((userOpts?: Partial<Options>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const ShareButtons: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    const title = (fileData.frontmatter?.title as string) ?? ""
    return (
      <div class={classNames(displayClass, "share-buttons")} data-title={title}>
        <span class="share-label">{opts.label}</span>
        <button class="sb-btn sb-native" data-share="native" title="공유하기" aria-label="공유하기">
          📤 공유
        </button>
        <button
          class="sb-btn sb-kakao"
          data-share="kakao"
          title="카카오톡 공유"
          aria-label="카카오톡 공유"
        >
          💬 카카오톡
        </button>
        <button class="sb-btn sb-x" data-share="x" title="X(트위터) 공유" aria-label="X 공유">
          𝕏 X
        </button>
        <button
          class="sb-btn sb-li"
          data-share="linkedin"
          title="링크드인 공유"
          aria-label="링크드인 공유"
        >
          링크드인
        </button>
        <button
          class="sb-btn sb-fb"
          data-share="facebook"
          title="페이스북 공유"
          aria-label="페이스북 공유"
        >
          페이스북
        </button>
        <button class="sb-btn sb-th" data-share="threads" title="스레드 공유" aria-label="스레드 공유">
          스레드
        </button>
        <button class="sb-btn sb-copy" data-share="copy" title="링크 복사" aria-label="링크 복사">
          🔗 링크복사
        </button>
      </div>
    )
  }

  ShareButtons.afterDOMLoaded = shareScript
  ShareButtons.css = styles

  return ShareButtons
}) satisfies QuartzComponentConstructor
