import Icon from './Icon';
import PanelTitle from './PanelTitle';

function TrafficCard({ icon, label, item }) {
  return <div className="traffic-card"><div className="data-value"><Icon name={icon} />{label}</div><strong className="metric-number">{item.value}</strong><p className="data-value"><em>{item.change}</em> {item.comparison}</p></div>;
}

export default function TrafficSummary({ traffic, heatmap }) {
  return <section className="traffic-panel"><PanelTitle icon="trend">Traffic Summary</PanelTitle>
    <div className="traffic-cards"><TrafficCard icon="truck" label="Truck / Day" item={traffic.daily} /><TrafficCard icon="calendar" label="Truck / Month" item={traffic.monthly} /></div>
    <div className="utilization"><div><span className="text-keys">Truck Utilization</span><strong>{traffic.utilization}%</strong></div><div className="progress"><i style={{ width: `${traffic.utilization}%` }} /></div></div>
    <div className="divider" />
    <div className="heatmap-title"><span className="text-keys">Activity Heatmap</span><span className="data-value">High</span></div>
    <div className="heatmap-wrap"><div className="heatmap">{heatmap.map((level, index) => <i key={index} style={{ '--level': level }} />)}</div><div className="heat-scale" /><span className="data-value low">Low</span></div>
  </section>;
}
