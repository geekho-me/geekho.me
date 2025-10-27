---
title: "How To: Hotfixing the NanoKVM Pro to get WiFi working"
date: 2025-10-26 12:00:00 +0000
last_modified_at: 2025-10-27
categories: [how-to, infrastructure]
tags: [how-to, infrastructure, iot, nanokvm]
description: "How to fix the NanoKVM Pro WiFi"
keywords: ["nanokvm", "nanokvm-pro", "fix", "wifi"]
image: /assets/img/2025-10-26/nanokvmpro-header-1230x630.webp
image_alt: "NanoKVM Pro Desk"
---

## Introduction

The NanoKVM Pro Desk is a cheap Ubuntu based KVM over IP by [Sipeed](https://wiki.sipeed.com/hardware/en/kvm/NanoKVM_Pro/introduction.html). As of the current firmware `v1.0.7` WiFi does not appear to be working. I have tried enabling WiFi both via the WebGUI (whilst connected to Ethernet) and in Access Point mode (with Ethernet disconnected) and it fails to connect.
The reason for this appears to be a result of some faulty scripts, so I have made workaround below.

## Enabling SSH

* Login to the NanoKVM, 
* Then go to <kbd>Settings</kbd>
* Then <kbd>Device</kbd>
* You can now enable <kbd>SSH</kbd>

![Enable SSH Toggle](/assets/img/2025-10-26/enable-ssh.webp)

* You can now login to SSH using the username `root` and your webgui password.

>Do not expose SSH to the public Internet.
{: .prompt-warning }

## Hotfixing WiFi

>This hotfix may break in future firmware updates.
{: .prompt-info }

The NanoKVM Pro does not use Ubuntu NetworkManager instead it appears to use `wpa_supplicant` & `dhclient` with a combination of custom scripts.

First we confirm the state of WiFi connection:

```bash
root@kvm-g33k:~# ip link
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether ab:12:cd:34:ef:56 brd ff:ff:ff:ff:ff:ff
3: sit0@NONE: <NOARP> mtu 1480 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/sit 0.0.0.0 brd 0.0.0.0
4: wlan0: <BROADCAST,MULTICAST> mtu 1500 qdisc mq state DOWN mode DEFAULT group default qlen 1000
    link/ether 12:ab:34:cd:56:ef brd ff:ff:ff:ff:ff:ff
```

As mentioned, NanoKVM uses some a custom Ubuntu Service and Script, which in the current firmware version (`v1.0.7` at time of writing) appears to be faulty. 

First we backup the original `wifi.service` in case we need to restore it in the future.

```bash
mv /etc/systemd/system/wifi.service /etc/systemd/system/wifi.service.old
```

Now we create a new `wifi.service`:

```bash
vi /etc/systemd/system/wifi.service
```

Paste the following:

```
[Unit]
Description=Custom WiFi bring-up
After=boot.mount network-pre.target
Wants=network-pre.target
Requires=boot.mount

[Service]
Type=oneshot
ExecStart=/opt/scripts/wifi.sh start
# ExecStop is optional now; leave it if you want a manual stop to cleanly disconnect
ExecStop=/opt/scripts/wifi.sh stop
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Now backup the WiFi script:

```bash
mv /opt/scripts/wifi.sh /opt/scripts/wifi.sh.old
```

Now create the new `wifi.sh` script:

```bash
vi /opt/scripts/wifi.sh
```

Paste the following:

```
#!/bin/sh

gen_hostapd_conf() {
  ssid="$1"; pass="$2"
  cat <<EOF
ctrl_interface=/var/run/hostapd
ctrl_interface_group=0
ssid=$ssid
hw_mode=g
channel=1
beacon_int=100
dtim_period=2
max_num_sta=255
rts_threshold=-1
fragm_threshold=-1
macaddr_acl=0
auth_algs=3
wpa=2
wpa_passphrase=$pass
ieee80211n=1
EOF
}

dhcp_client_run() {
  dhclient -v wlan0 || true
}

wpa_supplicant_run() {
  wpa_supplicant -B -i wlan0 -Dnl80211 -c /etc/wpa_supplicant.conf
}

wpa_supplicant_stop() {
  pkill -x wpa_supplicant 2>/dev/null || true
  ifconfig wlan0 down 2>/dev/null || true
}

wpa_supplicant_start() {
  if [ -e /boot/wifi.sta ]; then
    echo "wifi mode: sta"
    if [ -e /boot/wpa_supplicant.conf ]; then
      cp /boot/wpa_supplicant.conf /etc/wpa_supplicant.conf
    else
      ssid=""; pass=""
      [ -e /boot/wifi.ssid ] && ssid="$(cat /boot/wifi.ssid)"
      [ -e /boot/wifi.pass ] && pass="$(cat /boot/wifi.pass)"
      if [ -n "$ssid$pass" ]; then
        {
          echo "ctrl_interface=/run/wpa_supplicant"
          wpa_passphrase "$ssid" "$pass"
        } > /etc/wpa_supplicant.conf
      else
        echo "No SSID/PASS in /boot; skipping STA." >&2
        return 1
      fi
    fi
    ifconfig wlan0 up
    wpa_supplicant_run
    sleep 2
    dhcp_client_run
    return 0
  elif [ -e /boot/wifi.ap ]; then
    echo "wifi mode: ap"
    # (AP bits left as-is; fix typo)
    ifconfig wlan0 up
    ip addr flush dev wlan0
    # hostapd/udhcpd start would go here
    return 0
  elif [ -e /boot/wifi.mon ]; then
    echo "wifi mode: mon"
    airmon-ng start wlan0
    return 0
  else
    # default: try a fallback network if desired
    return 0
  fi
}

wifi_stop() {
  pkill -x wpa_supplicant 2>/dev/null || true
  dhclient -r wlan0 2>/dev/null || true
  ifconfig wlan0 down 2>/dev/null || true
}

wifi_start() {
  # device-specific pinmux
  devmem 0x104F200C 32 0x00000008
  devmem 0x104F2018 32 0x00000008
  devmem 0x104F2024 32 0x00000008
  devmem 0x104F2030 32 0x00000008
  devmem 0x104F203C 32 0x00000008
  devmem 0x104F2048 32 0x00000008

  lsmod | grep -q aic8800_bsp || insmod /soc/ko/aic8800_bsp.ko
  if lsmod | grep -q aic8800_fdrv; then
    echo "aic8800_fdrv already loaded"
  else
    insmod /soc/ko/aic8800_fdrv.ko
  fi

  # actually start Wi-Fi in STA/AP/mon per /boot flags
  wpa_supplicant_start
}

case "$1" in
  start)   echo "wifi start";   wifi_start ;;
  stop)    echo "wifi stop";    wifi_stop  ;;
  restart) echo "wifi restart"; wifi_stop; wifi_start ;;
  *) echo "usage: $0 {start|stop|restart}"; exit 1 ;;
esac
```

Now make the script executable:

```bash
chmod +x /opt/scripts/wifi.sh
```

Enable WiFi Client mode:

```bash
touch /boot/wifi.sta
```

Now we need to configure our WiFi SSID and Password. 
I use the `read` command to handle special characters:

```bash
root@kvm-g33k:~# read -r -p "SSID: " ssid; echo
SSID: GeekHome
root@kvm-g33k:~# read -rs -p "Password: " pass; echo
Password:
```
(Your password will be hidden).

Next we write the WiFi SSID and Password to the configuration files:

```bash
printf '%s' "$ssid" > /boot/wifi.ssid
printf '%s' "$pass" > /boot/wifi.pass
```

Reload and restart the Wifi service:

```bash
systemctl daemon-reload
systemctl restart wifi.service
```

You should now find WiFi is connected and if you reboot the NanoKVM it connects automatically on startup.
Don't forget to disable SSH!
