import sys
import os
import time

sys.path.insert(0, r"d:\Projetos_programacao\jarvis-ai\backend")
from app.services.system_monitor import get_system_stats

print("Starting get_system_stats...")
t0 = time.time()
try:
    stats = get_system_stats(1.0)
    print(f"Finished in {time.time() - t0:.2f} seconds")
    print(stats)
except Exception as e:
    print(f"Failed: {e}")
