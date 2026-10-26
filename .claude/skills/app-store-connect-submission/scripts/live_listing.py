#!/usr/bin/env python3
"""What the App Store shows now for a live app: the starting point of an update.

    python3 live_listing.py <app id | bundle id> [--country gb] [--json out.json]

Asks Apple's public lookup service (itunes.apple.com/lookup) and prints the
live version, its date and release notes, the name, the seller, the rating,
the minimum system, how many screenshots each device has, and the
description. The service does not return the subtitle, the keywords or the
promotional text: take those from the previous sheet or from App Store
Connect. The app id is the number in the store link (apps.apple.com/app/id…).
A sandbox without outbound network cannot reach the service; then work from
the previous sheet and say so.

The answer is the record's iPhone and iPad listing. A platform added to the
same record (visionOS, macOS, tvOS) has version pages of its own that the
service does not describe, and its screenshots are not counted here: a live
iPhone app does not make a first Vision Pro or Mac version an update.
"""
import json
import sys
import urllib.parse
import urllib.request


def main(argv):
    args, country, out = [], None, None
    it = iter(argv[1:])
    for a in it:
        if a == '--country':
            country = next(it, None)
        elif a == '--json':
            out = next(it, None)
        else:
            args.append(a)
    if len(args) != 1:
        print('usage: live_listing.py <app id | bundle id> [--country gb] [--json out.json]')
        return 2
    ident = args[0]
    q = {'id': ident} if ident.isdigit() else {'bundleId': ident}
    if country:
        q['country'] = country
    url = 'https://itunes.apple.com/lookup?' + urllib.parse.urlencode(q)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as r:
            data = json.load(r)
    except Exception as e:  # noqa: BLE001
        print(f'Could not reach the App Store lookup service ({e}).')
        print('Work from the previous sheet or the project\'s listing notes, and say the live listing was not checked.')
        return 1
    results = data.get('results') or []
    if not results:
        where = f' in the {country.upper()} storefront' if country else ''
        print(f'No live app found for {ident}{where}: a first submission, or not released there.')
        return 0
    a = results[0]
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(a, f, ensure_ascii=False, indent=2)
    shots = {k: len(a.get(k) or []) for k in ('screenshotUrls', 'ipadScreenshotUrls', 'appletvScreenshotUrls')}
    rows = [
        ('Name', a.get('trackName')),
        ('Bundle ID', a.get('bundleId')),
        ('App ID', a.get('trackId')),
        ('Seller', a.get('sellerName')),
        ('Version', a.get('version')),
        ('Released', a.get('currentVersionReleaseDate')),
        ('First released', a.get('releaseDate')),
        ('Rating', a.get('trackContentRating') or a.get('contentAdvisoryRating')),
        ('Category', ', '.join(a.get('genres') or [])),
        ('Price', a.get('formattedPrice')),
        ('Minimum system', a.get('minimumOsVersion')),
        ('Languages', ', '.join(a.get('languageCodesISO2A') or [])),
        ('Screenshots', f"iPhone {shots['screenshotUrls']}, iPad {shots['ipadScreenshotUrls']}, TV {shots['appletvScreenshotUrls']} (Mac and Vision Pro not counted)"),
        ('Store page', a.get('trackViewUrl')),
    ]
    for k, v in rows:
        print(f'{k + ":":<16}{v}')
    print('\nRelease notes of the live version:\n')
    print(a.get('releaseNotes') or '(none)')
    print('\nDescription:\n')
    print(a.get('description') or '(none)')
    print('\nThis is the record\'s iPhone and iPad listing. A platform added to the record '
          '(visionOS, macOS, tvOS) has its own version pages, which this does not show: its '
          'first version is a new platform, not an update.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
