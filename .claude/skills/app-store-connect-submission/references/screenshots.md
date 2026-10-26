# Screenshots and the other pictures

The sizes are Apple's as known in October 2026. Apple adds displays with
new devices and changes which slots are required, so the slot list on the
version page wins over this file; say so in the sheet when they disagree.

## Contents

1. The slots
2. Sizes
3. What a screenshot may show
4. App previews
5. Product page header and search results artwork

## 1. The slots

- Each platform's version page has its own: iPhone and iPad (and Apple
  Watch, for an app with a watch app) on the iOS page, then the Mac, Apple
  TV and Apple Vision Pro pages. One set per display size and localisation,
  1 to 10 images, in the order the product page shows them. The first three
  are the ones seen in search results; put the app's strongest screens
  there.
- App Store Connect marks the slots it requires for the device families the
  build supports; a smaller display with no set of its own shows the next
  larger one scaled down. Which slots are required changes: in October 2026
  the iPhone 6.3-inch display became required and refused 6.9-inch images
  ("File dimensions are invalid"), while the 6.9-inch became optional.
  Read the slot list on the page every time.
- A set for a device claims the app is made for it. A device that is new
  when the build is made (a new screen size or shape) is served properly
  only by a build made with the SDK that adds it; built with an older one
  the app runs in compatibility, and pictures of the device's own layout
  promise what the build does not give. Fill such a slot only once the
  build earns it.
- For an update the old sets stay unless replaced. Replace every set that
  shows the old version's look, not only the required ones: a set left in
  an optional slot goes on showing the old app to people with that device.

## 2. Sizes

Run `python3 scripts/check_screenshots.py <folder>` on the images before
uploading: it names each image's slot and flags sizes no slot takes,
transparency, and more than ten images for a slot. `--sizes` prints its
table, which is this one in full.

| Display | Pixels | Note |
|---|---|---|
| iPhone 6.9-inch | 1320×2868, 1290×2796, 1260×2736 | either way up |
| iPhone 6.5-inch | 1284×2778, 1242×2688 | either way up |
| iPhone 6.3-inch | 1206×2622, 1179×2556 | either way up; required in October 2026 |
| iPhone 6.1-inch | 1170×2532, 1125×2436, 1080×2340 | either way up |
| iPhone 5.5-inch | 1242×2208 | either way up |
| iPad 13-inch | 2064×2752, 2048×2732 | either way up; required for an app that runs on iPad |
| iPad 11-inch | 1668×2420, 1668×2388, 1640×2360, 1488×2266 | either way up |
| Mac | 2880×1800, 2560×1600, 1440×900, 1280×800 | 16:10 |
| Apple TV | 3840×2160, 1920×1080 | |
| Apple Vision Pro | 3840×2160 | 16:9 |
| Apple Watch | 422×514 (Ultra 3), 410×502 (Ultra, Ultra 2), 416×496 (Series 10, 11), 396×484 (Series 7 to 9), 368×448 (Series 4 to 6, SE) | |

Older displays (iPhone 4.7-inch and smaller, iPad 10.5-inch and 9.7-inch)
are in the script's table; App Store Connect rarely asks for them now.

Captures do not always come out at a slot's size. Check every capture with
the script before building a set on it. The visionOS simulator's saved
screens (2732×2048, 4:3, in Xcode 26) fit no Vision Pro slot as they come:
set each on a 3840×2160 canvas, or crop it to 16:9 and scale it up, and
look at the result at full size. An iPhone or iPad capture from a device or
the simulator of the slot's own device is already its size.

## 3. What a screenshot may show

- **The app in use on that device** (2.3.3): its own screens, not a splash
  or a sign-in screen alone, and not another platform's interface, bars or
  device frames. Captions and a background around the screen are allowed
  as long as the app's screen is the subject.
- **Only what this build has.** No "coming soon" features, nothing only
  another platform's version has, no features behind a purchase the build
  does not sell.
- **No prices or offers** in the pictures, no "free" banners, no ratings or
  awards claimed without a source, no other companies' names or logos.
- **A clean status bar.** On the simulator, `xcrun simctl status_bar booted
  override --time 9:41 --batteryState charged --batteryLevel 100` before
  capturing; on a device, cover nothing that the system draws.
- **PNG or JPEG, RGB, with no transparency.** The script flags a PNG with an
  alpha channel; flatten it onto its background.
- Light or dark, either; one look across a set reads better than a mix,
  unless the point of a pair is to show both.

## 4. App previews

Optional videos, up to three per display size, 15 to 30 seconds, played
muted when the product page opens. Screen recordings of the app itself (on a
device or the simulator), edited and captioned if wanted, with no hands or
devices filmed from outside. Their sizes differ from the screenshots' and
the upload names the ones it takes; a poster frame is picked for each. A
first submission does not need one: they are worth making once the app's
screens have settled.

## 5. Product page header and search results artwork

As App Store Connect described them in October 2026: optional pictures
shown on iOS 27 and iPadOS 27 or later, made in the app's Asset Library and
submitted on their own once the app has an approved version. The header is
21:9 at 3840×1646, JPEG or PNG; the search results picture 3:2, from
1920×1280 to 3840×2560; or one universal 16:9 PNG at 5244×2950 for both.
Videos run 5 to 30 seconds at 30 or 60 frames a second. No alpha channel.
