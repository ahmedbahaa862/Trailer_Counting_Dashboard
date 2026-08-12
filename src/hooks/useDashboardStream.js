import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || API_BASE.replace(/^http/, 'ws') + '/ws/dashboard';

export function cameraStreamUrl(cameraId) {
  return `${API_BASE}/api/cameras/${cameraId}/stream`;
}

export async function loadCameraConfig() {
  const response = await fetch(`${API_BASE}/api/config/cameras`);
  if (!response.ok) throw new Error('Unable to load camera settings');
  return response.json();
}

export async function saveCameraConfig(cameras) {
  const response = await fetch(`${API_BASE}/api/config/cameras`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cameras),
  });
  if (!response.ok) throw new Error((await response.json()).detail || 'Unable to save camera settings');
  return response.json();
}

export async function discoverCameras() {
  const response = await fetch(`${API_BASE}/api/discovery/cameras`);
  if (!response.ok) throw new Error('Unable to scan the local network');
  return response.json();
}

export default function useDashboardStream() {
  const [snapshot, setSnapshot] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting');
  const retryRef = useRef(0);

  useEffect(() => {
    let socket;
    let retryTimer;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      setConnectionState('connecting');
      socket = new WebSocket(WS_URL);
      socket.onopen = () => { retryRef.current = 0; setConnectionState('connected'); };
      socket.onmessage = (event) => {
        try { setSnapshot(JSON.parse(event.data)); } catch { setConnectionState('error'); }
      };
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        if (stopped) return;
        setConnectionState('offline');
        const delay = Math.min(10000, 1000 * 2 ** retryRef.current++);
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return { snapshot, connectionState };
}
