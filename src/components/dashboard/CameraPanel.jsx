import Icon from './Icon';
import PanelTitle from './PanelTitle';

export default function CameraPanel({ data }) {
  return <section className="camera-panel">
    <PanelTitle icon="camera" actions={<span className="live-badge data-value"><i /> Live</span>}>Live Camera View</PanelTitle>
    <div className="camera-content">
      <div className="camera-feed">
        <img src="/assets/reference.jpeg" alt="Main gate camera placeholder" />
        <div className="camera-meta data-value"><span><Icon name="truck" />Detected trucks: {data.detectedTrucks}</span><span>Current Queue: {data.currentQueue} Vehicles</span><span>{data.time}</span></div>
      </div>
      <div className="camera-list">{data.cameras.map((camera) => <button type="button" className="camera-button data-value" key={camera.id}><Icon name="camera" />{camera.name}<i /></button>)}</div>
    </div>
  </section>;
}
