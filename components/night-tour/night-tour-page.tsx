import Image from "next/image"
import Link from "next/link"
import { Shippori_Mincho, Barlow_Condensed } from "next/font/google"
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Compass, Flashlight } from "lucide-react"
import type { PlanDetail } from "@/lib/plan-details"
import { getPlanPriceDisplay } from "@/lib/plan-price-display"
import { NIGHT_TOUR_TIMES, SENIOR_RESTRICTED_AGE } from "@/lib/plan-flags"
import { getBookingPolicyCopy } from "@/lib/booking-policy-copy"
import { SITE_CONFIG } from "@/lib/site-config"
import { NIGHT_GUIDE } from "@/lib/staff"
import { TrackedCta } from "@/components/tracked-cta"
import { NightExperience, NightNavigation } from "./night-tour-experience"
import { NightEntrance } from "./night-tour-entrance"
import styles from "./night-tour.module.css"

const display = Shippori_Mincho({ weight: ["600", "800"], subsets: ["latin"], preload: false, variable: "--night-display" })
const condensed = Barlow_Condensed({ weight: ["500", "600"], subsets: ["latin"], display: "swap", variable: "--night-condensed" })

function BookingLink({ plan, location, children, className }: { plan: PlanDetail; location: string; children: React.ReactNode; className?: string }) {
  return <TrackedCta event="book_cta_click" eventProps={{ location, plan: plan.id }} href={`/book?plan=${plan.id}`} className={className || styles.primaryLink}>{children}<ArrowUpRight size={20} aria-hidden="true" /></TrackedCta>
}

export function NightTourPage({ plan }: { plan: PlanDetail }) {
  const isPrivate = plan.id === "S5"
  const prices = getPlanPriceDisplay(plan.id)!
  const policy = getBookingPolicyCopy()

  return (
    <NightExperience className={`${styles.night} ${display.variable} ${condensed.variable}`}>
      <a href="#details" className={styles.skipLink}>参加のご案内へ</a>
      <main id="night-main">
        <NightEntrance>
        <NightNavigation />
        <section className={styles.hero} aria-labelledby="night-title">
          <div className={styles.heroArt}>
            <Image src={NIGHT_GUIDE.image} alt={`夜の森でヤシガニと一緒に笑う、ガイドの${NIGHT_GUIDE.name}`} fill priority quality={85} sizes="(max-width: 700px) 100vw, 60vw" className={styles.heroPortrait} />
            <div className={styles.heroShade} />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.liveDot} /> 宮古島、日が沈んだら。</p>
            <p className={styles.heroIntro}>アマゾンで暮らした男、{NIGHT_GUIDE.name}と行く</p>
            <h1 id="night-title" className={styles.heroTitle}><span>この島の夜は、</span><strong>野生だ。</strong><small>{plan.name}</small></h1>
            <p className={styles.heroDescription}>ライトを片手に、いつもと違う宮古島へ。<br />夜の住人と、ひとクセある案内人が待っている。</p>
            <BookingLink plan={plan} location="night_hero">日付を選んで予約する</BookingLink>
            <p className={styles.heroPrice}>{plan.price}<span>／1名（税込） · {prices.caption}</span></p>
          </div>
          <div className={styles.heroSignature} aria-hidden="true"><span>YOUR GUIDE</span><strong>{NIGHT_GUIDE.latinName.toUpperCase()}</strong><span>アマゾン帰りの、夜の案内人。</span></div>
          <a href="#guide" className={styles.scrollCue}><span>夜の入口へ</span><ArrowDown size={17} aria-hidden="true" /></a>
          <span className={styles.heroSideNote} aria-hidden="true">MIYAKOJIMA / AFTER DARK</span>
        </section>
        </NightEntrance>

        <div className={styles.quickFacts} aria-label="ツアーの概要">
          <p><span>探検の時間</span><strong>{plan.duration}</strong></p>
          <p><span>出発時刻</span><strong>{NIGHT_TOUR_TIMES.join(" / ")}</strong></p>
          <p><span>参加できる年齢</span><strong>{plan.age}</strong>{!isPrivate && <small><Link href="/plans/S5">{SENIOR_RESTRICTED_AGE}歳以上の方は貸切へ</Link></small>}</p>
          <p><span>冒険のスタイル</span><strong>{isPrivate ? "あなたのグループだけの貸切" : "ガイドと歩く夜の生き物探し"}</strong></p>
        </div>

        <section id="guide" className={`${styles.section} ${styles.guide}`} aria-labelledby="guide-title">
          <div className={styles.guidePhoto} data-night-reveal>
            <Image src={NIGHT_GUIDE.storyImage} alt={`森の中で大きな根を手にする${NIGHT_GUIDE.name}`} fill sizes="(max-width: 700px) 90vw, 40vw" quality={85} />
            <span className={styles.photoCaption}>森に入ると、この人の話は止まらない。</span>
            <span className={styles.guideStamp} aria-hidden="true">森を<br />知る男</span>
          </div>
          <div className={styles.guideCopy} data-night-reveal>
            <p className={styles.eyebrow}>MEET YOUR GUIDE</p>
            <h2 id="guide-title">案内人も、<br />ちょっと野生。</h2>
            <div className={styles.guideName}><strong>{NIGHT_GUIDE.name}</strong><span>{NIGHT_GUIDE.latinName.toUpperCase()} / {NIGHT_GUIDE.role}</span></div>
            <p>{NIGHT_GUIDE.description}</p>
            <p>小さな生き物の気配。足元の動き。昼間なら通り過ぎてしまう場所にも、夜は違う世界が広がっている。{NIGHT_GUIDE.name}と歩けば、森の見え方が変わるかもしれない。</p>
            <p className={styles.guideEnd}>生き物の話も、アマゾンの話も。<br />気になったことは、なんでも聞いてみて。</p>
            <div className={styles.guideLinks}>
              <a className={styles.textLink} href="#encounters">{NIGHT_GUIDE.name}と夜の森へ <ArrowDown size={16} aria-hidden="true" /></a>
              <Link className={styles.textLink} href={`/staff#${NIGHT_GUIDE.id}`}>スタッフ紹介を見る <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          <aside id="book" className={styles.guideBook} aria-labelledby="guide-book-title" data-night-reveal>
            <div className={styles.bookCopy}>
              <p className={styles.bookLabel}><BookOpen size={19} strokeWidth={1.3} aria-hidden="true" />{NIGHT_GUIDE.name}の書籍</p>
              <h3 id="guide-book-title">{NIGHT_GUIDE.book.heading}</h3>
              <p className={styles.bookDescription}>{NIGHT_GUIDE.book.description}</p>
            </div>
            <div className={styles.bookAction}>
              <a href={NIGHT_GUIDE.book.url} target="_blank" rel="noopener noreferrer" className={styles.bookLink} aria-label="Amazonで購入する（新しいタブで開きます）">Amazonで購入する <ArrowUpRight size={18} aria-hidden="true" /></a>
              <p>書籍の詳細・価格はAmazonへ</p>
            </div>
          </aside>
        </section>

        <section id="encounters" className={`${styles.section} ${styles.encounters}`} aria-labelledby="encounters-title">
          <div className={styles.encounterHeading} data-night-reveal>
            <div><p className={styles.eyebrow}>INTO THE NIGHT</p><h2 id="encounters-title">光の先に、<br /><em>誰がいる？</em></h2></div>
            <p>葉っぱの裏、木の根元、岩のすきま。<br />ライトを向けた先で出会う、夜の住人たち。<br />何に会えるかは、その夜のお楽しみ。</p>
          </div>
          <figure className={styles.creatureMain} data-night-light data-night-reveal>
            <Image src="/images/tours/night/night-01.webp" alt="懐中電灯に照らされた、大きなハサミを持つヤシガニ" fill sizes="(max-width: 700px) 100vw, 88vw" quality={85} />
            <div className={styles.flashlightShade} aria-hidden="true" />
            <figcaption><span>夜の森で探したい</span><strong>ヤシガニ</strong><p>大きなハサミに、思わず息をのむ。</p></figcaption>
            <span className={styles.lightHint}><Flashlight size={15} aria-hidden="true" /> 写真に触れて、光を動かしてみよう</span>
          </figure>
          <div className={styles.creaturePair}>
            <figure data-night-reveal><div className={styles.creaturePhoto}><Image src="/images/tours/night/night-04.webp" alt="夜の地面に姿を見せたカエル" fill sizes="(max-width: 700px) 90vw, 42vw" /></div><figcaption><span>足元にも、もうひとつの世界。</span><p>立ち止まると、見えてくるものがある。</p></figcaption></figure>
            <figure data-night-reveal><div className={styles.creaturePhoto}><Image src="/images/tours/night/night-06.webp" alt="落ち葉の間で見つけた夜のカニ" fill sizes="(max-width: 700px) 90vw, 42vw" /></div><figcaption><span>葉っぱの音に、耳をすます。</span><p>小さな気配を、ガイドと一緒に探そう。</p></figcaption></figure>
          </div>
          <p className={styles.natureNote}>野生の生き物との出会いは、季節・天候などによって変わります。特定の生き物との遭遇を保証するものではありません。</p>
        </section>

        <section className={`${styles.section} ${styles.journey}`} aria-labelledby="journey-title">
          <div data-night-reveal><p className={styles.eyebrow}>TONIGHT’S ADVENTURE</p><h2 id="journey-title">夜は、こうして<br />深まっていく。</h2><p className={styles.sectionLead}>集合から解散まで、ガイドと一緒に。<br />初めての夜の森でも、自分のペースで。</p><Compass className={styles.compass} size={120} strokeWidth={0.6} aria-hidden="true" /></div>
          <ol className={styles.timeline}>
            {plan.flow.map(step => <li key={step.step} data-night-reveal><span className={styles.stepNumber}>{String(step.step).padStart(2, "0")}</span><div>{step.time && <p className={styles.stepTime}>{step.time}</p>}<h3>{step.title}</h3><p>{step.description}</p></div></li>)}
          </ol>
        </section>

        <section id="details" className={`${styles.section} ${styles.details}`} aria-labelledby="details-title">
          <div className={styles.detailsHeading} data-night-reveal><p className={styles.eyebrow}>BEFORE YOU GO</p><h2 id="details-title">冒険の支度。</h2><p>持ち物と集合のご案内。出発前に、ここだけ確認。</p></div>
          <div className={styles.infoColumns}>
            <div><h3>集合場所・時間</h3><p>{plan.location}</p>{plan.locationNote && <p>{plan.locationNote}</p>}<p className={styles.meetingTime}>{plan.meetingTime}</p><Link className={styles.textLink} href="/access">集合場所のご案内 <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
            <div><h3>持ってくるもの</h3><ul>{plan.whatToBring.map(item => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>料金に含まれるもの</h3><ul className={styles.includedList}>{plan.included.map(item => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></div>
          </div>
          <div className={styles.participationNotice}><h3>ご参加の前に</h3><p>対象年齢：{plan.age}</p>{!isPrivate && <p>{SENIOR_RESTRICTED_AGE}歳以上の方を含むグループは、<Link href="/plans/S5">貸切ナイトツアー</Link>をご予約ください。</p>}<ul>{plan.precautions.map(item => <li key={item}>{item}</li>)}</ul></div>
        </section>

        <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title">
          <div><p className={styles.eyebrow}>QUESTIONS IN THE DARK</p><h2 id="faq-title">気になること、<br />聞いておこう。</h2></div>
          <div>{plan.faqs.map(faq => <details key={faq.q} className={styles.faqItem}><summary>{faq.q}<ChevronDown size={19} aria-hidden="true" /></summary><p>{faq.a}</p></details>)}</div>
        </section>

        <section id="reserve" className={`${styles.section} ${styles.reserve}`} aria-labelledby="reserve-title">
          <div className={styles.reserveIntro} data-night-reveal><p className={styles.eyebrow}>YOUR NIGHT STARTS HERE</p><h2 id="reserve-title">さあ、<br />夜の向こうへ。</h2><p>旅の思い出に、ちょっと野生な夜を。</p><Link href={isPrivate ? "/plans/S3" : "/plans/S5"} className={styles.textLink}>{isPrivate ? "通常のナイトツアーを見る" : "自分たちだけで楽しむ、貸切プランも"}<ArrowRight size={17} aria-hidden="true" /></Link></div>
          <div className={styles.bookingCard}>
            <p className={styles.bookingType}>{isPrivate ? "PRIVATE NIGHT TOUR / 完全貸切" : "NIGHT TOUR / 通常プラン"}</p>
            <h3>{plan.name}</h3>
            <div className={styles.bookingPrice}>{plan.price}<span>／1名（税込）</span></div>
            <div className={styles.priceBreakdown}>{prices.rows.map(row => <p key={row.label}><span>{row.label} <small>({row.note})</small></span><strong>{row.price}</strong></p>)}</div>
            <p className={styles.freeNote}>{prices.caption} · {plan.duration}</p>
            <BookingLink plan={plan} location="night_reserve">日付を選んで予約する</BookingLink>
            <p className={styles.bookingPayment}>{plan.paymentMethod}</p>
            <TrackedCta event="line_click" eventProps={{ location: "night_reserve", plan: plan.id }} href={SITE_CONFIG.lineUrl} external className={styles.lineLink}>予約前にLINEで相談する <ArrowUpRight size={15} aria-hidden="true" /></TrackedCta>
          </div>
          <details className={styles.cancellation}><summary>お支払い・キャンセルについて <ChevronDown size={17} aria-hidden="true" /></summary><div><p>{policy.paymentSummary}。{policy.prepaymentNotice}</p><p>前日までのキャンセル：{policy.previousDayFee} ／ 当日：{policy.sameDayFee} ／ 無断キャンセル：{policy.noShowFee}</p><p>{policy.weatherNotice}</p><Link href="/terms">詳しい利用規約を確認する</Link></div></details>
        </section>
      </main>

      <footer className={styles.footer}>
        <div><Link href="/" className={styles.footerBrand}>{SITE_CONFIG.siteNameJa}</Link><p>昼は海へ。夜は森へ。</p></div>
        <nav aria-label="サイトのご案内"><Link href="/plans">すべてのツアー</Link><Link href="/safety">安全への取り組み</Link><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/tokushoho">特定商取引法に基づく表記</Link></nav>
        <span className={styles.footerNote}>{NIGHT_GUIDE.latinName.toUpperCase()}’S NIGHT TOUR · MIYAKOJIMA</span>
      </footer>
      <div className={styles.mobileBooking}><div><span>{isPrivate ? "貸切ナイトツアー" : "本格ナイトツアー"}</span><strong>{plan.price}<small>／名</small></strong></div><BookingLink plan={plan} location="night_mobile" className={styles.mobileBookingLink}>日付を選ぶ</BookingLink></div>
    </NightExperience>
  )
}
