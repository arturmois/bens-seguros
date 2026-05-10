export function HeroBackground(): React.ReactElement {
  return (
    <>
      {/* Grid dots */}
      <div
        className="bg-size-[24px_24px] absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)]"
        aria-hidden="true"
      />
      {/* Teal orb — top center */}
      <div
        className="animate-orb-drift bg-primary-500/20 absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[60px]"
        aria-hidden="true"
      />
      {/* Gold orb — bottom right */}
      <div
        className="animate-orb-drift bg-accent-500/15 absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full blur-[60px]"
        style={{ animationDelay: '-5s' }}
        aria-hidden="true"
      />
    </>
  )
}
