from __future__ import annotations

import re
import socket
import time
import uuid
from urllib.parse import urlparse


PROBE = '''<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header><w:MessageID>uuid:{message_id}</w:MessageID><w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>
  <e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body>
</e:Envelope>'''


class DiscoveryUnavailable(RuntimeError):
    pass


def _local_ipv4_addresses() -> list[str]:
    addresses: set[str] = set()
    try:
        for item in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET, socket.SOCK_DGRAM):
            address = item[4][0]
            if not address.startswith("127.") and not address.startswith("169.254."):
                addresses.add(address)
    except socket.gaierror:
        pass
    # A UDP connect selects the active route without sending any traffic.
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("192.0.2.1", 9))
        address = probe.getsockname()[0]
        if not address.startswith("127."):
            addresses.add(address)
    except OSError:
        pass
    finally:
        probe.close()
    return sorted(addresses)


def discover_onvif_devices(timeout: float = 3.0) -> list[dict[str, str]]:
    """Discover ONVIF cameras and recorders on the local IPv4 network."""
    payload = PROBE.format(message_id=uuid.uuid4()).encode()
    devices: dict[str, dict[str, str]] = {}
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    sock.settimeout(0.35)
    try:
        sent = False
        errors: list[str] = []
        interfaces = _local_ipv4_addresses()
        for interface in interfaces or [None]:
            try:
                if interface:
                    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(interface))
                sock.sendto(payload, ("239.255.255.250", 3702))
                sent = True
            except OSError as error:
                errors.append(f"{interface or 'default'}: {error}")
        if not sent:
            detail = "; ".join(errors) or "no active IPv4 LAN interface"
            raise DiscoveryUnavailable(f"ONVIF discovery is unavailable ({detail})")
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                data, address = sock.recvfrom(65535)
            except socket.timeout:
                continue
            text = data.decode(errors="ignore")
            xaddr_match = re.search(r"<(?:\w+:)?XAddrs[^>]*>(.*?)</(?:\w+:)?XAddrs>", text, re.I | re.S)
            scopes_match = re.search(r"<(?:\w+:)?Scopes[^>]*>(.*?)</(?:\w+:)?Scopes>", text, re.I | re.S)
            addresses = xaddr_match.group(1).split() if xaddr_match else []
            xaddr = next((value for value in addresses if value.startswith("http")), "")
            host = urlparse(xaddr).hostname if xaddr else address[0]
            scopes = scopes_match.group(1) if scopes_match else ""
            name_match = re.search(r"onvif://www.onvif.org/name/([^\s<]+)", scopes, re.I)
            name = name_match.group(1).replace("%20", " ") if name_match else f"ONVIF device {host}"
            devices[host] = {"id": host, "name": name, "host": host, "serviceUrl": xaddr, "type": "ONVIF camera / recorder"}
    finally:
        sock.close()
    return sorted(devices.values(), key=lambda item: item["host"])
