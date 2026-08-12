import Header from './Header';
import CameraPanel from './CameraPanel';
import TrafficSummary from './TrafficSummary';
import WeightCard from './WeightCard';
import InvoicePanel from './InvoicePanel';
import TrendChart from './TrendChart';
import KpiPanel from './KpiPanel';
import { dashboardData } from '../../data/mockDashboardData';

export default function DashboardCanvas({ theme, onToggleTheme }) {
  return <main className="dashboard-viewport"><div className={`dashboard-canvas ${theme}`}>
    <img className="dashboard-background" src={theme === 'dark' ? '/assets/dashboard-dark.png' : '/assets/camera-page2.png'} alt="" />
    <Header theme={theme} onToggleTheme={onToggleTheme} />
    <CameraPanel data={dashboardData} />
    <TrafficSummary traffic={dashboardData.traffic} heatmap={dashboardData.heatmap} />
    <div className="weights">{dashboardData.weights.map((item) => <WeightCard item={item} key={item.label} />)}</div>
    <InvoicePanel invoices={dashboardData.invoices} />
    <TrendChart values={dashboardData.trend} labels={dashboardData.trendLabels} />
    <KpiPanel values={dashboardData.kpis} />
    <nav className="pager" aria-label="Dashboard pages"><i className="active"/><i/><i/><i/></nav>
  </div></main>;
}
