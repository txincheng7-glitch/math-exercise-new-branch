import subprocess
import sys

# 打印当前Python解释器路径，用来确认是否在虚拟环境中
print(f"当前Python解释器路径：{sys.executable}")

deps = [
    "ballyregan",
    "git+https://github.com/jishux2/poe-api-wrapper.git@v2",
    "numpy==1.26.4"
]

for dep in deps:
    print(f"正在安装：{dep}")
    subprocess.check_call([sys.executable, "-m", "pip", "install", dep])

# 在原来的install_poe.py最后添加：
print("恢复关键依赖版本...")
subprocess.check_call([
    sys.executable, "-m", "pip", "install",
    "pydantic==2.5.3",
    "pydantic-settings==2.1.0"
])