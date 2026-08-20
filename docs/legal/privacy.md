# Privacy Policy

Effective date: 2026-08-20 · Applies to: https://maps.erraticl.uk

## Summary

Erratic Maps is a free, non-commercial map poster tool. It has no
accounts, no analytics, no advertising, no cookies, and no tracking.
Your poster renders and exports entirely on your own device. Nothing
you create is uploaded anywhere.

## Controller

Marcel Lerch
Contact: offramp@erraticl.uk

## What data flows where, and why

The site itself stores nothing about you on a server. When you use it,
your browser makes the following technical requests. Each request
transmits your IP address, because that is how the internet works. The
legal basis for all of them is Art. 6(1)(f) GDPR — the legitimate
interest in delivering the functionality you requested.

### Hosting (Cloudflare)

The site is served by Cloudflare Pages (Cloudflare, Inc.). Cloudflare
processes connection data (IP address, requested URL, user agent) in
server logs to deliver the site and defend it against abuse. See
Cloudflare's privacy policy for details.

### Map tiles (OpenFreeMap)

The map loads vector tiles from `tiles.openfreemap.org` (OpenFreeMap,
serving OpenStreetMap data). Each tile request tells that server your
IP address and which map area you are viewing.

### Location search (Nominatim)

When you search for a place, the text you type is sent to
`nominatim.openstreetmap.org` (OpenStreetMap Foundation) to find
coordinates. Do not type personal data into the search box that you do
not want to transmit; a street address you search for is sent to
Nominatim by design.

### GitHub (star counter)

The interface shows the star count of this project's repository. Your
browser fetches that number from `api.github.com` (GitHub, Inc.).

## Data on your device only

The app stores its working state in your browser's localStorage and
IndexedDB: the selected theme, recent locations, your export count,
and any custom marker icons you add. A service worker caches the app
shell and map tiles for offline use. All of this stays on your device.
You can remove it at any time by clearing the site data in your
browser.

## What does not happen

- No cookies, no consent banners needed.
- No analytics or advertising scripts. The pages load no tracker.
- No account, no registration, no server-side storage of your posters.
- Fonts are self-hosted; choosing a typeface makes no third-party
  request.

## Your rights

Under the GDPR you have the rights of access (Art. 15), rectification
(Art. 16), erasure (Art. 17), restriction (Art. 18), data portability
(Art. 20), and objection (Art. 21). Because this site keeps no
server-side data about you, most requests will have nothing to act on
— but you can always write to the contact address above. You also have
the right to complain to a data protection supervisory authority
(Art. 77).

## Changes

If the site's behavior changes (for example, a new third-party
service), this policy changes with it. The effective date above tells
you the current version. The full history is public in the project's
Git repository.
