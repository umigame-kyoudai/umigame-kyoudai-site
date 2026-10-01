import Image from "next/image"

const STORAGE_KEY = "umk-intro-seen"

// オープニングを流すかどうかを、HTMLの解析中（最初の描画より前）に決める。
// - タブごとに1回だけ（sessionStorage）。?intro=1 を付けると何度でも再生できる（確認用）
// - 「視差効果を減らす」設定の人、#付きURLで特定セクションに飛んできた人には出さない
// - 幕をタップするとスキップ。3.2秒後には必ず data-intro="done" になり、幕は消える
const introScript = `(function(){try{
var d=document.documentElement;
var force=/[?&]intro=1(&|$)/.test(location.search);
if(!force){
if(location.hash)return;
if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
if(sessionStorage.getItem("${STORAGE_KEY}"))return;
}
sessionStorage.setItem("${STORAGE_KEY}","1");
d.setAttribute("data-intro","play");
var t0=Date.now();
function skip(e){var t=e.target;if(d.getAttribute("data-intro")==="play"&&t&&t.closest&&t.closest(".motion-intro")&&Date.now()-t0<1400)d.setAttribute("data-intro","skip");}
document.addEventListener("pointerdown",skip,true);
setTimeout(function(){d.setAttribute("data-intro","done");document.removeEventListener("pointerdown",skip,true);},3200);
}catch(e){}})();`

const bubbles = [
  { left: "14%", size: 10, delay: "0s", duration: "1.9s" },
  { left: "27%", size: 6, delay: "0.35s", duration: "1.6s" },
  { left: "46%", size: 8, delay: "0.15s", duration: "2s" },
  { left: "63%", size: 12, delay: "0.5s", duration: "1.8s" },
  { left: "78%", size: 7, delay: "0.2s", duration: "1.7s" },
  { left: "89%", size: 9, delay: "0.6s", duration: "1.6s" },
]

// 上から見たウミガメのシルエット（右向き）。ヒレは CSS で羽ばたかせる。
function SeaTurtle() {
  return (
    <svg viewBox="0 0 200 160" className="motion-turtle" fill="currentColor" focusable="false">
      <path className="fl fl-back-top" d="M72 62 C62 52 50 46 38 46 C46 54 54 63 66 71 Z" />
      <path className="fl fl-back-bottom" d="M72 98 C62 108 50 114 38 114 C46 106 54 97 66 89 Z" />
      <path className="fl fl-front-top" d="M124 60 C116 38 96 18 64 10 C82 26 96 44 106 64 Z" />
      <path className="fl fl-front-bottom" d="M124 100 C116 122 96 142 64 150 C82 134 96 116 106 96 Z" />
      <path d="M60 80 L44 75 L47 80 L44 85 Z" />
      <ellipse cx="146" cy="80" rx="15" ry="11.5" />
      <ellipse cx="97" cy="80" rx="41" ry="31" />
      <path
        className="motion-turtle__scutes"
        d="M68 80 H126 M84 55 L91 80 L84 105 M110 55 L103 80 L110 105"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * サイトに入ったときのオープニング。
 * 海の幕の中をウミガメ兄弟が横切り、ロゴが浮かび、波の形で幕が上がってヒーローが現れる（約2.2秒）。
 * 表示・非表示は html[data-intro] で切り替えるので、React のハイドレーションを待たずに動く。
 */
export function OpeningIntro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: introScript }} />
      <div className="motion-intro" aria-hidden="true">
        <div className="motion-intro__stage">
          <div className="motion-intro__rays" />
          <div className="motion-intro__swim motion-intro__swim--big">
            <SeaTurtle />
          </div>
          <div className="motion-intro__swim motion-intro__swim--small">
            <SeaTurtle />
          </div>
          <div className="motion-intro__bubbles">
            {bubbles.map((b) => (
              <span
                key={b.left}
                style={{
                  left: b.left,
                  width: b.size,
                  height: b.size,
                  animationDelay: b.delay,
                  animationDuration: b.duration,
                }}
              />
            ))}
          </div>
        </div>

        <div className="motion-intro__brand">
          <Image
            src="/images/sea-turtle-brothers-logo-white.png"
            alt=""
            width={1276}
            height={903}
            sizes="(max-width: 640px) 240px, 320px"
            className="motion-intro__logo"
          />
          <p className="motion-intro__place">MIYAKOJIMA · OKINAWA</p>
        </div>

        <svg className="motion-intro__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" focusable="false">
          <path
            className="motion-intro__wave-back"
            d="M0 0 H1440 V58 C1320 84 1190 88 1060 70 C930 52 820 30 700 40 C580 50 470 86 340 84 C210 82 110 54 0 66 Z"
          />
          <path
            className="motion-intro__wave-front"
            d="M0 0 H1440 V36 C1320 66 1200 78 1080 60 C960 42 840 14 720 26 C600 38 480 80 360 74 C240 68 120 36 0 48 Z"
          />
        </svg>
      </div>
    </>
  )
}
