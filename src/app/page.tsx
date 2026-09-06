import Link from "next/link";
import { Mic, NotebookPen, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 pt-10 pb-8" style={{ background: "var(--color-indigo)" }}>
        <p className="text-xs font-medium tracking-wide mb-3" style={{ color: "var(--color-mustard)" }}>
          SIH26042 · Govt. of Jharkhand
        </p>
        <h1 className="font-display text-4xl leading-[1.1] mb-3" style={{ color: "var(--color-paper)" }}>
          Vernova
        </h1>
        <p className="text-[15px] leading-relaxed" style={{ color: "rgba(241,236,224,0.75)" }}>
          Speak Hindi. Your students hear Santhali. Any teacher can deliver
          mother-tongue instruction — no language training required.
        </p>
      </div>

      <div className="px-6 flex flex-col gap-3 -mt-1">
        <Link
          href="/translate"
          className="group flex items-center gap-4 p-5 rounded-2xl transition-transform active:scale-[0.98]"
          style={{ background: "var(--color-mustard)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(21,34,56,0.15)" }}>
            <Mic size={22} color="var(--color-indigo)" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold" style={{ color: "var(--color-indigo)" }}>
              Voice Translation
            </h2>
            <p className="text-[13px]" style={{ color: "rgba(21,34,56,0.75)" }}>
              Live Hindi ↔ Santhali conversation
            </p>
          </div>
          <ArrowRight size={18} color="var(--color-indigo)" />
        </Link>

        <Link
          href="/worksheet"
          className="group flex items-center gap-4 p-5 rounded-2xl transition-transform active:scale-[0.98] hairline"
          style={{ background: "var(--color-indigo-light)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(241,236,224,0.1)" }}>
            <NotebookPen size={22} color="var(--color-mustard)" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold" style={{ color: "var(--color-paper)" }}>
              Worksheet Generator
            </h2>
            <p className="text-[13px]" style={{ color: "rgba(241,236,224,0.6)" }}>
              Bilingual worksheets, NIPUN Bharat aligned
            </p>
          </div>
          <ArrowRight size={18} color="var(--color-paper)" />
        </Link>
      </div>

      <div className="px-6 mt-8">
        <h3 className="font-display text-sm font-semibold mb-4" style={{ color: "rgba(241,236,224,0.9)" }}>
          How a lesson flows
        </h3>
        <ol className="flex flex-col gap-4">
          {[
            ["Teacher speaks Hindi", "Tap record and speak the lesson normally."],
            ["Instantly translated", "Speech is recognised, translated, and voiced in Santhali."],
            ["Student hears & practises", "Worksheets reinforce the same content, bilingually."],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold mt-0.5"
                style={{ background: "var(--color-rust)", color: "var(--color-paper)" }}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: "var(--color-paper)" }}>{title}</p>
                <p className="text-[13px]" style={{ color: "rgba(241,236,224,0.55)" }}>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="px-6 mt-10">
        <p className="text-[11px] text-center" style={{ color: "rgba(241,236,224,0.4)" }}>
          Powered by Bhashini APIs · Government of India, MeitY
        </p>
      </div>
    </div>
  );
}
