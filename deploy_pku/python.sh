apt install -y \
    build-essential \
    zlib1g-dev \
    libncurses5-dev \
    libncursesw5-dev \
    libreadline-dev \
    libsqlite3-dev \
    libgdbm-dev \
    libdb-dev \
    libbz2-dev \
    liblzma-dev \
    libssl-dev \
    libffi-dev \
    uuid-dev \
    tk-dev \
    libbluetooth-dev \
    libbluetooth3 \
    libdb5.3-dev
wget https://www.python.org/ftp/python/3.10.12/Python-3.10.12.tgz
tar -xvf Python-3.10.12.tgz
cd Python-3.10.12
./configure --enable-optimizations
make -j$(nproc)
make altinstall  # 避免覆盖系统默认的 Python