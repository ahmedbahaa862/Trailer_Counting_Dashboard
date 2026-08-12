import PanelTitle from './PanelTitle';

export default function InvoicePanel({ invoices }) {
  return <section className="invoice-panel"><PanelTitle icon="invoice">Invoice Summary</PanelTitle><div className="invoice-grid">{invoices.map((item) => <div className="invoice-card" key={item.label}><span className="data-value">{item.label}</span><div><strong>{item.value}</strong><em className="data-value">{item.change}</em></div><small className="data-value">{item.detail}</small><i /></div>)}</div></section>;
}
