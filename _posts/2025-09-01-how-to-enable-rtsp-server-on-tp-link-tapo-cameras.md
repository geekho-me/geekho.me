---
title: "How To: Enable RTSP Server on TP-Link Tapo Cameras"
date: 2025-09-01 12:00:00 +0000
last_modified_at: 2025-09-02
categories: [how-to, cameras]
tags: [cctv, physical security, onvif, rtsp, smart-home]
description: "Enable RTSP and ONVIF on TP-Link Tapo cameras with step-by-step instructions, example URLs, and security tips for use with VLC, Home Assistant, and Frigate."
keywords: ["camera", "cctv", "tp-link", "tapo", "c100", "webcam", "rtsp"]
image: /assets/img/2025-09-01/tapo-rtsp-social-1200x630.jpg
image_alt: "How to enable RTSP on TP-Link Tapo cameras"
---

## Introduction

TP-Link Tapo cameras are an affordable and easy way to get into security cameras. They typically can be powered by USB, use Wi-Fi, and have cloud connectivity if you want it. They also have the ability to enable an RTSP server so you can integrate them into other services like `Frigate`, `Home Assistant`, `go2rtc`, etc.

In this example I will run through the steps of enabling the RTSP on a [TP-Link Tapo C100](https://www.tp-link.com/home-networking/cloud-camera/tapo-c100/).

## Enabling the RTSP Service

1. Assuming your camera is already set up and working, open the Tapo app (Android shown).

    Once the Tapo app is loaded, tap on the camera you want to configure:

    ![Tapo home screen with camera tile selected](/assets/img/2025-09-01/Screenshot_20250902-121904_1_230x512.webp)

2. Tap on the hexagon in the top right corner to open the Device Settings:

    ![Camera live view with settings (hexagon) icon](/assets/img/2025-09-01/Screenshot_20250902-121936_1_230x512.webp)

3. Tap on <kbd>Advanced Settings</kbd>:

    ![Device Settings screen showing Advanced Settings](/assets/img/2025-09-01/Screenshot_20250902-121948_1_230x512.webp)

4. Tap on <kbd>Camera Account</kbd>:

    ![Advanced Settings screen showing Camera Account option](/assets/img/2025-09-01/Screenshot_20250902-121957_1_230x512.webp)

5. Tap <kbd>Create Now</kbd>:

    ![Camera Account page with Create Now button](/assets/img/2025-09-01/Screenshot_20250902-122005_1_230x512.webp)

6. Next, TP-Link warns you about some of the risks with enabling RTSP, if you are happy to proceed tap <kbd>Understand and Agree</kbd>:

    ![RTSP warning dialog with Understand and Agree button](/assets/img/2025-09-01/Screenshot_20250902-122013_1_230x512.webp)

7. Next choose a username and strong unique password per camera. I would suggest avoiding using default usernames such as `admin`, `administrator`, `tapoadmin`, etc. These credentials are separate to your TP-Link ID. Once done, tap <kbd>Create</kbd>:

    ![Create camera account screen with username and password fields](/assets/img/2025-09-01/Screenshot_20250902-122114_1_230x512.webp)

8. Now we can confirm RTSP is enabled as `Camera Account` is now set to `On`:

    ![Camera Account status showing On after creation](/assets/img/2025-09-01/Screenshot_20250902-123259_1_230x512.webp)

9. Now we need to know the IP address of our camera, you can find this in <kbd>Network Settings</kbd>:

    ![Network Settings screen showing camera IP address](/assets/img/2025-09-01/Screenshot_20250902-123315_1_230x512.webp)

    Your IP address will vary depending on your local network setup.

## Viewing the Camera Streams

Now the RTSP (TCP/554) and ONVIF (TCP/2020) services are enabled and you can view them using the example links:

* High Quality Stream: `rtsp://<USER>:<PASS>@<CAMERA_IP>:554/stream1`
* Low Quality Stream: `rtsp://<USER>:<PASS>@<CAMERA_IP>:554/stream2`
* ONVIF: `http://<USER>:<PASS>@<CAMERA_IP>:2020/onvif/device_service`

If you are struggling to get the links for your model of camera, check the [iSpyConnect Tapo profiles](https://www.ispyconnect.com/camera/tapo).

Example RTSP stream via VLC:

![VLC playing the Tapo RTSP stream](/assets/img/2025-09-01/Screenshot_2025-09-02_143647_1_728x512.webp)

## Considerations

* It is recommended to configure the camera to use a static IP address either via a DHCP reservation or on the camera itself.
* Two-way audio does not work in RTSP mode.
* Tapo cameras do not support the download of snapshots.

***WARNING!*** The RTSP & ONVIF ports should not be exposed to the public internet. If you want remote connectivity use a service like a VPN or another service (e.g. `Home Assistant`) to make the camera feed available. You may also want to consider disabling [UPnP](https://en.wikipedia.org/wiki/Universal_Plug_and_Play) on your router to avoid accidental exposure.

You should also consider isolating cameras on an IoT VLAN where feasible.

If you block the camera from accessing the internet this will disable the Cloud connectivity features. You may notice over time the time and date will start to drift. You can allow outbound [NTP](https://en.wikipedia.org/wiki/Network_Time_Protocol) (UDP/123) to the internet to resolve this.
