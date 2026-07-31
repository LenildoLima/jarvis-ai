import psutil
from app.models.system import SystemStats

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
    try:
        disk = psutil.disk_usage("C:\\").percent
    except Exception:
        disk = psutil.disk_usage("/").percent

    current_net = psutil.net_io_counters()
    sent_kbps = (current_net.bytes_sent - _last_net.bytes_sent) / 1024 / interval
    recv_kbps = (current_net.bytes_recv - _last_net.bytes_recv) / 1024 / interval
    _last_net = current_net

    gpu_percent = _get_gpu_percent()
    temperature = _get_temperature()

    return SystemStats(
        cpu_percent=round(cpu, 1),
        ram_percent=round(ram, 1),
        disk_percent=round(disk, 1),
        network_sent_kbps=round(max(sent_kbps, 0), 1),
        network_recv_kbps=round(max(recv_kbps, 0), 1),
        gpu_percent=gpu_percent,
        temperature_celsius=temperature,
    )


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
