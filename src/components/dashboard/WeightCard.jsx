import PanelTitle from './PanelTitle';

export default function WeightCard({ item }) {
  return <section className="weight-card"><PanelTitle icon="weight">{item.label}</PanelTitle><div className="gauge" style={{ '--progress': `${item.progress * 1.8}deg` }}><div><strong>{item.value}</strong><span className="data-value">{item.unit}</span></div></div><p className="data-value"><em>{item.progress}%</em> {item.detail}</p></section>;
}
