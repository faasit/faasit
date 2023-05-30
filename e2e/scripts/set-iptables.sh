#!/bin/bash

function set_iptables() {

  tproxy_ip="$1"

  if [ -z "$tproxy_ip" ]; then
    echo "require <proxy_ip>"
    exit 1
  fi

  # CREATE TABLE
  iptables -t mangle -N clash

  # RETURN LOCAL AND LANS
  iptables -t mangle -A clash -d 0.0.0.0/8 -j RETURN
  iptables -t mangle -A clash -d 10.0.0.0/8 -j RETURN
  iptables -t mangle -A clash -d 127.0.0.0/8 -j RETURN
  iptables -t mangle -A clash -d 169.254.0.0/16 -j RETURN
  iptables -t mangle -A clash -d 172.16.0.0/12 -j RETURN
  iptables -t mangle -A clash -d 192.168.50.0/16 -j RETURN
  iptables -t mangle -A clash -d 192.168.9.0/16 -j RETURN

  iptables -t mangle -A clash -d 224.0.0.0/4 -j RETURN
  iptables -t mangle -A clash -d 240.0.0.0/4 -j RETURN

  # School Local Ip
  iptables -t mangle -A clash -d 210.28.0.0/8 -j RETURN

  # FORWARD ALL
  iptables -t mangle -A clash -p udp -j TPROXY --on-ip "$tproxy_ip" --on-port 22087 --tproxy-mark 1
  iptables -t mangle -A clash -p tcp -j TPROXY --on-ip "$tproxy_ip" --on-port 22087 --tproxy-mark 1

  # HIJACK ICMP (untested)
  # iptables -t mangle -A clash -p icmp -j DNAT --to-destination 127.0.0.1

  # REDIRECT
  iptables -t mangle -I PREROUTING -j clash
}

set_iptables $@
