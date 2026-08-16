export default function GlowyDivider({
  className = '',
  width = '100%',
  height = '0.15vh',
  color = '#06b6d4',
  duration = '8s',
}) {
  return (
    <div
      className={`glowy-divider ${className}`}
      style={{
        width,
        height,
        marginTop: '0.38vh',
        background: `linear-gradient(to right, transparent, ${color} 50%, transparent)`,
        animationDuration: duration,
      }}
      aria-hidden="true"
    />
  );
}
