---
title: "TP-Link PG2400P Reboot Script"
date: 2025-10-30 12:00:00 +0000
last_modified_at: 2025-10-30
categories: [automation, infrastructure]
tags: [iot, pg2400p, powerline, python, tp-link]
description: "Automating reboots of the TP-Link PG2400P G.hn2400 Powerline adapter via its web GUI"
keywords: ["automation", "pg2400p", "powerline", "python", "reboot", "script", "tp-link", "webgui"]
image: /assets/img/2025-10-30/powerline-header-1230x630.webp
image_alt: "TP-Link PG2400P G.hn2400 Powerline Kit"
comments: true
---

# Introduction

I'm using the TP-Link PG2400P G.hn2400 Powerline Kit to extend my network, which suffers from stability issues. At least once a week, the connection experiences significant packet loss and then drops completely.

To restore connectivity, I usually have to reboot one of the adapters. This can be done by physically power-cycling it or via the soft reboot option in its web GUI.

Since the device offers no API or CLI for management, I decided to automate this periodic reboot by creating a script to simulate interaction with its simple web GUI.

## Automation

In this example, I have two Powerline adapters:
* My remote adapter is at `192.168.1.100`
* My local adapter is at `192.168.1.101` 

Rebooting either adapter will restore connectivity.

The web GUI uses only plain HTTP (unencrypted), so it was a matter of performing a packet capture with Wireshark and reviewing the HTTP requests.

>This communicates the password in plaintext and uses a weak MD5 hash for the password; 
>Do not expose this to untrusted networks!
{: .prompt-danger }

## Automating Login

The web GUI uses a MD5 hash (in lowercase) of your password to authenticate. 

You can generate a MD5 hash by doing the following:

```bash
john@GeekHome:~$ echo -n 'MyStrongPassword' | md5sum | cut -d' ' -f1
f78e7ab810633ab3a6bbaa49d7d6d5eb
```

To authenticate to the `TPLINK.GENERAL.LOGIN_PASSWORD` parameter is your MD5 hash:

```
POST / HTTP/1.1
Host: 192.168.1.101
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0
Accept: text/plain, */*; q=0.01
Accept-Language: en-GB,en;q=0.5
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest
Content-Length: 62
Origin: http://192.168.1.101
Sec-GPC: 1
Connection: keep-alive
Referer: http://192.168.1.101/
Priority: u=0

TPLINK.GENERAL.LOGIN_PASSWORD=f78e7ab810633ab3a6bbaa49d7d6d5eb
```

On success the adapter responds with a `TOKEN` parameter containing the session token; note this as it's needed in subsequent requests. `ERROR=000` indicates success:

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 51

ERROR=000
TOKEN=3D5waE0G3nOjTtXv4Wd7m9xmhraO3ZqZ
```

On failed authentication attempts you will get an `ERROR=006` response:

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 26

ERROR=006
LOGIN_TIMES=1
```

## Automating Reboot

Now we have the `TOKEN` parameter we can perform an authenticated reboot. 
To do this, we make the following request:

```
POST /?_t=3D5waE0G3nOjTtXv4Wd7m9xmhraO3ZqZ HTTP/1.1
Host: 192.168.1.101
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0
Accept: text/plain, */*; q=0.01
Accept-Language: en-GB,en;q=0.5
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest
Content-Length: 25
Origin: http://192.168.1.101
Sec-GPC: 1
Connection: keep-alive
Referer: http://192.168.1.101/
Priority: u=0

SYSTEM.GENERAL.HW_RESET=1
```

On success, the adapter will respond and then reboot:

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

ERROR=000
```

## One Oddity

Some attempts to authenticate fail the first time; regardless of whether your password is correct, the adapter may respond with `ERROR=004`. Follow-up authentication attempts will then work fine. I don't know if this due to buggy session handling or if the device uses the client connection to seed its RNG.

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

ERROR=004
```

## Putting it all together

I have created a [Python script](https://github.com/geekho-me/PG2400P-Reboot) which automates the process of soft rebooting the Powerline Adapter and handling the `004` error if it occurs:

```bash
john@GeekHome:~$ python router_reboot.py --ip 192.168.1.101 --password MyStrongPassword
[+] Target router: http://192.168.1.101
[+] Preflight warm-up...
[+] Logging in...
[+] TOKEN obtained.
[+] Sending reboot command...
[+] Reboot command accepted (ERROR=000). The router should be rebooting now.
```
