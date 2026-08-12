const iconMap = {
  camera: '/assets/cctv.png', truck: '/assets/truck.png', calendar: '/assets/clender.png',
  weight: '/assets/weight1.png', trend: '/assets/trend.png', kpi: '/assets/kpi.png', invoice: '/assets/invoice.png',
};

export default function Icon({ name, className = '' }) {
  return <img className={`icon ${className}`} src={iconMap[name]} alt="" aria-hidden="true" />;
}
