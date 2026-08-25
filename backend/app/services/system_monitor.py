import psutil
from app.models.system import SystemStats, DiskStats

# Guarda a última leitura de rede para calcular a taxa (kbps) entre chamadas
_last_net = psutil.net_io_counters()


def get_system_stats(interval: float) -> SystemStats:
    """
    Lê as métricas atuais da máquina local.
    GPU e temperatura ficam None por padrão — ver notas abaixo para habilitar.
    """
    global _last_net

    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent

    current_net = psutil.net_io_counters()
    sent_kbps = (current_net.bytes_sent - _last_net.bytes_sent) / 1024 / interval
    recv_kbps = (current_net.bytes_recv - _last_net.bytes_recv) / 1024 / interval
    _last_net = current_net

    gpu_percent = _get_gpu_percent()
    temperature = _get_temperature()
    gpu_name = _get_gpu_name()

    mem = psutil.virtual_memory()
    cpu_freq = psutil.cpu_freq()

    disks = _get_all_disks()
    # Disco "principal" (o primeiro da lista, geralmente C:) continua
    # preenchendo disk_percent/disk_total_gb/disk_used_gb, para não
    # quebrar quem já usa esses campos (ex: a barra compacta da Topbar).
    primary_disk = disks[0] if disks else None

    return SystemStats(
        cpu_percent=round(cpu, 1),
        ram_percent=round(ram, 1),
        disk_percent=primary_disk.percent if primary_disk else 0.0,
        network_sent_kbps=round(max(sent_kbps, 0), 1),
        network_recv_kbps=round(max(recv_kbps, 0), 1),
        gpu_percent=gpu_percent,
        temperature_celsius=temperature,
        cpu_cores=psutil.cpu_count(logical=True),
        cpu_freq_ghz=round(cpu_freq.current / 1000, 1) if cpu_freq else None,
        ram_total_gb=round(mem.total / (1024**3), 1),
        ram_used_gb=round(mem.used / (1024**3), 1),
        disk_total_gb=primary_disk.total_gb if primary_disk else None,
        disk_used_gb=primary_disk.used_gb if primary_disk else None,
        disks=disks,
        gpu_name=gpu_name,
    )


def _get_all_disks() -> list[DiskStats]:
    """
    Lista TODOS os discos/partições reais do sistema (não só o principal).
    No Windows, isso pega cada letra de unidade (C:, D:, etc.) que tiver
    um sistema de arquivos real montado — ignora drives de CD/DVD vazios
    ou outras partições sem mídia, que causariam erro ao ler.
    """
    disks = []
    for partition in psutil.disk_partitions(all=False):
        if not partition.fstype:
            # Sem sistema de arquivos (ex: leitor de CD sem mídia) — pula
            continue
        try:
            usage = psutil.disk_usage(partition.mountpoint)
        except (PermissionError, OSError):
            continue

        disks.append(
            DiskStats(
                name=partition.device,
                used_gb=round(usage.used / (1024**3), 1),
                total_gb=round(usage.total / (1024**3), 1),
                percent=round(usage.percent, 1),
            )
        )
    return disks


def _get_gpu_percent() -> float | None:
    """
    GPU não é lida pelo psutil. Para NVIDIA, instale `pynvml`
    (pip install nvidia-ml-py) e implemente aqui. Deixado como None
    por enquanto para não travar em máquinas sem suporte.
    """
    try:
        import pynvml

        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        util = pynvml.nvmlDeviceGetUtilizationRates(handle)
        pynvml.nvmlShutdown()
        return float(util.gpu)
    except Exception:
        return None


def _get_gpu_name() -> str | None:
    """Nome da GPU, se pynvml estiver disponível (mesma limitação de _get_gpu_percent)."""
    try:
        import pynvml

        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        name = pynvml.nvmlDeviceGetName(handle)
        pynvml.nvmlShutdown()
        return name if isinstance(name, str) else name.decode("utf-8")
    except Exception:
        return None


def _get_temperature() -> float | None:
    """
    Temperatura via psutil só funciona no Linux (sensors_temperatures).
    No Windows, é necessário WMI ou uma lib como `wmi` + OpenHardwareMonitor.
    Deixado como None por enquanto — implementar quando for testar no Windows.
    """
    try:
        temps = psutil.sensors_temperatures()
        if not temps:
            return None
        first_sensor = next(iter(temps.values()))
        return first_sensor[0].current if first_sensor else None
    except (AttributeError, Exception):
        return None