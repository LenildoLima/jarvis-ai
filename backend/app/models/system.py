from pydantic import BaseModel


class DiskStats(BaseModel):
    name: str  # ex: "C:\\", "D:\\"
    used_gb: float
    total_gb: float
    percent: float


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

    # Detalhes de hardware — mudam raramente (só se trocar peça), mas são
    # enviados junto para a tela "Sistema" mostrar contexto (núcleos, GHz,
    # capacidade total etc.), sem precisar de uma rota separada.
    cpu_cores: int | None = None
    cpu_freq_ghz: float | None = None
    ram_total_gb: float | None = None
    ram_used_gb: float | None = None
    # disk_total_gb/disk_used_gb continuam existindo, refletindo o disco
    # PRINCIPAL (C:), para não quebrar quem já usa esses campos (ex: a
    # barra compacta da Topbar). Para ver TODOS os discos, use `disks`.
    disk_total_gb: float | None = None
    disk_used_gb: float | None = None
    disks: list[DiskStats] = []
    gpu_name: str | None = None