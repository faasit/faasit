FROM debian:stretch
RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak
COPY stretch-sources.list /etc/apt/sources.list

RUN apt-get update && apt-get install -y \
    apt-utils \
    procps \
    wget \
    libssl-dev \
    telnet \
    curl \
    cython \
    imagemagick \
    libopencv-dev\
    fonts-wqy-zenhei \
    vim \
    fonts-wqy-microhei \
    libpng-dev \
    libbz2-dev \
    tk \
    libmemcached11 \
    libmemcachedutil2 \
    --no-install-recommends && rm -r /var/lib/apt/lists/*

RUN cp /etc/apt/sources.list /etc/apt/sources.list.bak
COPY ./jessie-sources.list /etc/apt/sources.list

RUN apt-get update && apt-get install -y \
    libpng12-0 \
    libmysqlclient18 \
    libssl1.0.0 \
    libwebp5 \
    --no-install-recommends \
    --allow-unauthenticated \
    && rm -r /var/lib/apt/lists/* 

RUN mv /etc/apt/sources.list.bak /etc/apt/sources.list 

RUN apt-get update && apt-get install -y \
    nfs-common gnupg ca-certificates \
    --no-install-recommends && rm -r /var/lib/apt/lists/*

ENV NODE_VERSION v14.18.0
ENV FASSIT_PROVIDER local
RUN wget http://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz -O /tmp/node-${NODE_VERSION}-linux-x64.tar.gz \
    && cd /tmp && tar -zxvf /tmp/node-${NODE_VERSION}-linux-x64.tar.gz \
    && mv /tmp/node-${NODE_VERSION}-linux-x64 /opt/node


ENV PATH $PATH:/opt/node/bin


RUN mkdir -p /code && cd /code
RUN mkdir -p /node_modules

COPY server /server

WORKDIR /server


CMD ["bash"]