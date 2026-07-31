from pydantic import BaseModel


class SystemStats(BaseModel):
    cpu_percent: float
    ram_percent: float
    disk_percent: float
    network_sent_kbps: float
    network_recv_kbps: float
    # GPU e temperatura ficam como opcionais por enquanto —
    # dependem de bibliotecas extras (pynvml/wmi), ver system_monitor.py
    gpu_percent: float | None = None
    temperature_celsius: float | None = None
