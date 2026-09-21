export function HeroBackground(): React.ReactElement {
  return (
    <>
      {/* Grid dots */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px]"
        aria-hidden="true"
      />
      {/* Teal orb — top center */}
      <div
        className="absolute top-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 animate-orb-drift rounded-full bg-primary-500/20 blur-[60px]"
        aria-hidden="true"
      />
      {/* Gold orb — bottom right */}
      <div
        className="absolute right-0 bottom-0 h-[400px] w-[400px] animate-orb-drift rounded-full bg-accent-500/15 blur-[60px]"
        style={{ animationDelay: '-5s' }}
        aria-hidden="true"
      />
    </>
  )
}
