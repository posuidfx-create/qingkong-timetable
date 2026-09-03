/* eslint-disable react-refresh/only-export-components -- bilingual editorial copy is exported for content regression tests */
import { useState } from "react"
import { BookOpen, Check, Cloud, Copy, Database, Feather, Info, MessageCircle, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_VERSION_TAG } from "@/constants/appVersion"
import { useI18n } from "@/i18n/useI18n"

export const ABOUT_CONTENT = {
  "zh-CN": {
    title: "关于「努力也是一种天赋」",
    mobileTitle: "关于本站",
    mobileBrandTitle: "「努力也是一种天赋」",
    subtitle: "一个围绕课程、学习记录、知识整理、单词积累与个人成长构建的校园学习空间。",
    paragraphs: [
      "这个网站是由我一个人独立构思、设计、开发并持续维护的个人项目。",
      "我并不是一个特别自律的人。也正因为这样，我想为自己做一个真正属于自己的系统，把每天学习过的内容、上过的课程、拍下来的资料、完成过的作品，以及大学以来一路上的想法、变化和心路历程慢慢记录下来。",
      "这个网站以后还会不断加入我自己想到的新功能。这里的每一个核心想法、功能方向和最终决定，都来自我自己的思考。",
      "AI 是我在设计、开发和分析过程中使用的辅助工具之一，但我希望真正重要的事情——想到什么、为什么去做、怎么把它实现出来——始终由我自己决定，并且真正付诸行动。",
      "我希望这不是一个做完就结束的课堂作业，而是一个能够伴随我的大学生活长期成长、持续更新的项目。它也是我给自己的一个提醒：哪怕我现在还不够自律，也可以通过一点一点地记录、学习和行动，让自己慢慢变得更好。",
      "从课程安排、课堂记录到知识整理与单词积累，零散的学习内容会逐渐沉淀成属于自己的知识库。单词与语法可以按教材和课次整理，并保留逐词发音、个人笔记与 AI 辅助知识整理；DeepSeek AI 只作为辅助工具，原始记录与个人判断始终由自己保留。",
      "在记录自己的学习之外，也可以把课程笔记和知识整理主动分享到课程公共知识库，与其他学习者共同积累课程内容；私人学习记录与原始附件仍然保持独立和私密。",
      "因为我想成为一个更好的自己。",
    ],
    featuresTitle: "现在可以做什么",
    features: ["课程表：查看并管理24级、25级与自己的课程安排", "私人学习空间：按课程整理个人记录、资料、知识与时间线", "课程公共知识库：主动分享课程笔记、知识整理与明确授权的资料", "DeepSeek AI 学习整理：为私人文字记录与公开课程知识生成结构化整理", "日语学习：按教材与课次整理单词和语法，支持逐词发音、个人笔记与 AI 辅助知识整理", "聊天与待办：处理日常交流、提醒和学习任务", "个人设置：管理身份、主题、课表、作息与本地数据"],
    creationTitle: "创作方式",
    creationBadge: "独立创作 · AI 辅助",
    creation: "本网站由个人独立构思、设计和开发。AI 工具用于辅助编程、分析、视觉探索和内容整理，核心产品方向、功能选择和最终实施决定均由作者本人完成。",
    operationTitle: "运行与服务",
    frontend: "前端托管",
    frontendDescription: "通过 Cloudflare 全球边缘网络提供网页内容。",
    data: "数据与账户",
    dataDescription: "用于账户认证、数据库、Realtime 与 Storage。",
    region: "数据服务区域以当前 Supabase 项目配置为准",
    statusTitle: "项目状态",
    status: "长期个人项目",
    maintenance: "持续维护与更新，并随着我的学习和大学生活持续成长。",
    disclaimer: "本网站为个人独立项目，不是大连东软信息学院或国际教育学院官方网站，不代表学校官方立场。",
    ending: "努力也是一种天赋。",
    endingNote: "记录不是为了证明过去，\n而是为了看见自己正在改变。",
  },
  "ja-JP": {
    title: "「努力も才能のひとつ」について",
    mobileTitle: "「努力も才能のひとつ」について",
    mobileBrandTitle: null,
    subtitle: "授業・学習記録・知識整理・単語の蓄積・成長をひとつにつなぐ、キャンパス学習スペース。",
    paragraphs: [
      "このサイトは、私が一人で企画・デザイン・開発し、長期的に育てていく個人プロジェクトです。",
      "私は決して、とても自律的な人間ではありません。だからこそ、自分のための仕組みをつくり、毎日の授業、学んだこと、撮影した資料、完成した作品、そして大学生活の中で感じたことや心の変化を少しずつ残していきたいと思っています。",
      "このサイトには、これからも自分で思いついた機能を少しずつ追加していきます。",
      "AI は、開発・分析・デザインの探索・情報整理を助けてくれる道具のひとつです。しかし、何を作るのか、なぜそれを作るのか、そして実際に行動して形にするのか。その中心にある考えと決断は、自分自身のものです。",
      "これは、一度作って終わる課題にはしたくありません。大学生活と一緒に成長し、長く記録を積み重ねていく場所にしたいと思っています。そしてこのサイトは、まだ十分に自律できていない自分が、少しずつ前へ進み、もっと良い自分になるための記録でもあります。",
      "時間割、授業記録、知識整理、単語の蓄積を通して、断片的な学びを自分だけの知識庫へ育てていきます。単語と文法は教材・課ごとに整理でき、単語ごとの発音、自分のメモ、AIによる補助整理にも対応します。元の記録と最終的な判断は自分自身のものです。",
      "自分の学習を記録するだけでなく、授業ノートや知識整理を授業共有ナレッジへ投稿し、ほかの学習者と授業内容を積み重ねられます。個人の学習記録と元の添付資料は引き続き独立して非公開です。",
    ],
    featuresTitle: "現在できること",
    features: ["時間割：24年・25年と自分の授業予定を確認・管理", "個人学習スペース：授業ごとに記録・資料・知識・タイムラインを整理", "授業共有ナレッジ：授業ノート・知識整理・共有権限を確認した資料を投稿", "DeepSeek AI 学習整理：個人のテキスト記録と公開授業知識を構造化", "日本語学習：教材と課ごとに単語・文法を整理し、単語ごとの発音・自分のメモ・AI補助整理に対応", "チャットとToDo：日々の交流・連絡・学習タスクを管理", "個人設定：プロフィール・テーマ・時間割・授業時間・端末データを管理"],
    creationTitle: "制作について",
    creationBadge: "独立制作 · AI アシスト",
    creation: "本サイトは個人で企画・デザイン・開発しています。AI ツールは、プログラミング、分析、デザイン検討、情報整理の補助として使用しています。プロダクトの方向性、機能の選択、そして最終的な実装判断は制作者本人が行っています。",
    operationTitle: "運用とサービス",
    frontend: "フロントエンド",
    frontendDescription: "Cloudflare のグローバルエッジネットワークを通じて配信しています。",
    data: "データとアカウント",
    dataDescription: "認証・データベース・Realtime・Storage に使用しています。",
    region: "データサービスの地域は、現在の Supabase プロジェクト設定に準じます",
    statusTitle: "プロジェクトの状態",
    status: "長期的な個人プロジェクト",
    maintenance: "学びと大学生活に合わせて、継続的に保守・更新していきます。",
    disclaimer: "本サイトは個人による独立プロジェクトです。大連東軟信息学院および国際教育学院の公式ウェブサイトではなく、学校の公式見解を代表するものではありません。",
    ending: "努力も才能のひとつ。",
    endingNote: "記録は過去を証明するためではなく、\n自分が変わりつつあることに気づくために。",
  },
} as const

export const ABOUT_SECTION_ORDER = ["manifesto", "creation", "operation", "status", "ending", "contact"] as const

export function AboutPage() {
  const { locale, t } = useI18n()
  const copy = ABOUT_CONTENT[locale]
  const [copied, setCopied] = useState(false)
  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText("posuidx05")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  return <article className="about-workspace mx-auto w-full max-w-7xl pb-8" aria-labelledby="about-page-title">
    <section className="workspace-window about-manifesto-window">
      <div className="about-heading-column"><Info aria-hidden="true" className="size-5 text-primary" /><p className="about-brand-meta mt-5 text-xs font-semibold tracking-[0.14em] text-muted-foreground">{t("brand.name")} · {APP_VERSION_TAG}</p><h2 aria-label={copy.title} className="about-page-title mt-3 max-w-4xl font-medium" id="about-page-title"><span aria-hidden="true" className="about-title-desktop">{copy.title}</span><span aria-hidden="true" className="about-title-mobile">{copy.mobileTitle}{copy.mobileBrandTitle ? <small>{copy.mobileBrandTitle}</small> : null}</span></h2><p className="about-subtitle mt-5 max-w-2xl text-base text-muted-foreground">{copy.subtitle}</p></div>
      <div className="about-copy-column">{copy.paragraphs.map((paragraph) => <p className="text-sm text-foreground/88" key={paragraph}>{paragraph}</p>)}</div>
    </section>

    <div className="about-context-grid">
      <section className="workspace-window about-info-window"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{copy.featuresTitle}</h3><BookOpen aria-hidden="true" className="size-5 text-primary" /></div><ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">{copy.features.map((feature) => <li className="border-b border-border/60 pb-3 last:border-0" key={feature}>{feature}</li>)}</ul></section>
      <section className="workspace-window about-info-window"><div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-semibold">{copy.creationTitle}</h3><p className="mt-1 text-xs text-primary">{copy.creationBadge}</p></div><Feather aria-hidden="true" className="size-5 text-primary" /></div><p className="mt-4 text-sm leading-7 text-muted-foreground">{copy.creation}</p></section>
      <section className="workspace-window about-info-window"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{copy.operationTitle}</h3><Cloud aria-hidden="true" className="size-5 text-primary" /></div><dl className="mt-4 space-y-4 text-sm"><div><dt className="font-semibold">{copy.frontend}</dt><dd className="mt-1 text-muted-foreground">Cloudflare Pages · {copy.frontendDescription}</dd></div><div><dt className="font-semibold">{copy.data}</dt><dd className="mt-1 text-muted-foreground">Supabase · {copy.dataDescription}</dd></div><div className="flex items-start gap-2 rounded-xl border border-border/60 p-3 text-xs leading-5 text-muted-foreground"><Database aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />{copy.region}</div></dl></section>
      <section className="workspace-window about-info-window"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{copy.statusTitle}</h3><ShieldCheck aria-hidden="true" className="size-5 text-primary" /></div><p className="mt-4 text-sm font-medium">{copy.status}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.maintenance}</p><p className="mt-5 border-t border-border/60 pt-4 text-xs leading-6 text-muted-foreground">{copy.disclaimer}</p></section>
    </div>

    <footer className="about-ending"><p>{copy.ending}</p><span>{copy.endingNote}</span></footer>
    <section className="about-contact mx-auto mt-8 w-full max-w-4xl border-t border-border/60 px-1 pt-7" aria-labelledby="about-contact-title"><div className="flex items-start gap-3"><MessageCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold" id="about-contact-title">{t("about.contactTitle")}</h3><p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{t("about.contactBody")}</p><div className="mt-4 flex min-h-11 flex-wrap items-center gap-3 text-sm"><span className="text-muted-foreground">{t("about.wechat")}</span><code className="font-sans font-semibold text-foreground">posuidx05</code><Button aria-label={t("about.copyWechat")} className="min-h-11" onClick={() => void copyWechat()} size="sm" type="button" variant="ghost">{copied ? <Check /> : <Copy />}{copied ? t("about.copiedWechat") : t("common.copy")}</Button></div></div></div></section>
  </article>
}
