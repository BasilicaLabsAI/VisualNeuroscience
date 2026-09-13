# The Apple Vision Pro app

`VisionAtlas.xcodeproj` is a native visionOS app, separate from the Capacitor
shell in `ios/`. The iPad app runs on Vision Pro as a flat window; this one
puts the brain in the room.

## What it does

It opens on a **console**, a small window with one button per thing the app
can show:

- **The brain.** A volumetric window with the MNI152 brain as an object you
  can walk around and turn by dragging. Three sliders under it cut the brain
  open along the sagittal, coronal and axial planes, from the right, the
  front and the top. Each cut face shows the template's MRI slice at that
  position, so cutting in reveals the anatomy the surface hides. The three
  cuts combine, so two or three together take a corner out.
- **The atlas.** The website in a browser window: the Region Atlas, Brodmann
  areas, tractography and the rest, as they are on the web. This loads the
  live site for now; the iPhone and iPad app carries the same pages offline.

More models go on the console as they are made; the brain is the first.

## Files

| File | Holds |
|---|---|
| `VisionAtlas/VisionAtlasApp.swift` | The three windows: console, brain volume, atlas browser. |
| `VisionAtlas/ConsoleView.swift` | The console and its buttons. |
| `VisionAtlas/BrainVolumeView.swift` | The volumetric window: RealityView, drag-to-turn, the slider ornament. |
| `VisionAtlas/BrainScene.swift` | The scene behind it: loads the data, rebuilds the cut mesh, paints the slice on each cut face. |
| `VisionAtlas/MeshClipper.swift` | Cuts the surface mesh back to the kept part, exactly at the planes. |
| `VisionAtlas/BrainData.swift` | Reads the two data files; gunzips with the Compression framework. |
| `VisionAtlas/AtlasBrowser.swift` | The web view window. |
| `VisionAtlas/Resources/brain.mesh` | The brain's outer surface, 148,080 triangles, MNI millimetres. |
| `VisionAtlas/Resources/brain.vol.gz` | The MNI152 template, brain voxels only, 0.74 mm. |

The two data files are made from `site/assets/mni152.nii.gz` by
`scripts/make-vision-assets.mjs`, using the same surface code the Region
Atlas uses for its 3D export, so the brain here is the one the website
exports. Run `npm run vision-assets` from `app/` to remake them; they only
change if the template does.

The Xcode project lists no files by hand: the `VisionAtlas` folder is a
synchronised group, so anything put in it is part of the target.

## Building and running

```
cd app && npm run vision
```

or open `visionos/VisionAtlas.xcodeproj` in Xcode. Pick the **Apple Vision
Pro** simulator as the destination and run. Xcode will ask for a signing team
the first time; automatic signing with the same team as the iOS app is right.

The bundle identifier is `ai.visualneuroscience.app`, the same as the iPhone
and iPad app on purpose: in App Store Connect a native visionOS build joins
the same app record under **Add Platform → visionOS**, and from then on Vision
Pro users get this app instead of the iPad one. Until that build is uploaded,
nothing changes for them.

## Frames

The data is in MNI millimetres: x to the subject's right, y anterior, z
superior. RealityKit wants metres with y up, so a point (x, y, z) mm is
placed at (x, z, −y) × scale ÷ 1000, centred on the middle of the volume. The
brain is shown at twice life size, which is about a football.

The cut faces are textured quads. Their texture coordinates assume RealityKit's
convention that v = 0 is the bottom row of the image; if a slice ever shows
upside down, that assumption is the thing to flip, in `sliceQuad` in
`BrainScene.swift`.
