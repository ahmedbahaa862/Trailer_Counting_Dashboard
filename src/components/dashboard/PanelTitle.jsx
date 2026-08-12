import Icon from './Icon';

export default function PanelTitle({ icon, children, actions }) {
  return <div className="panel-title"><div><Icon name={icon} /><h2 className="text-keys">{children}</h2></div>{actions}</div>;
}
