export default function ScreenHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-6 pt-8 pb-6" style={{ background: "var(--color-indigo)" }}>
      <p className="text-xs font-medium tracking-wide mb-2" style={{ color: "var(--color-mustard)" }}>
        {eyebrow}
      </p>
      <h1 className="font-display text-2xl font-semibold mb-1.5" style={{ color: "var(--color-paper)" }}>
        {title}
      </h1>
      <p className="text-[13px]" style={{ color: "rgba(241,236,224,0.6)" }}>
        {subtitle}
      </p>
    </div>
  );
}
