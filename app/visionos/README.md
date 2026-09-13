# The Apple Vision Pro app

`VisionAtlas.xcodeproj` is a native visionOS app, separate from the Capacitor
shell in `ios/`. The iPad app runs on Vision Pro as a flat window; this one
puts the brain in the room.

## What it does

It opens on a **console**, a small window with one button per thing the app
can show:

- **The brain.** A volumetric window with the MNI152 brain as an object you
  can walk around, facing you as a person would. Drag it to turn it any way
  you like, pinch to size it, turn two hands to spin it. Its own console
  opens with it, holding six sliders and the region picker. The sliders cut
  the brain from the outside in, a pair per axis on one line, left and
  right, back and front, bottom and top, each pair mirrored so both knobs
  travel inwards from their own edge; every cut face shows the template's
  MRI slice at that position. The surface is the one the Region Atlas
  renders, at full resolution.
- **Highlight regions.** The brain console's picker lists the AAL-116
  regions as the Region Atlas does, grouped by lobe, left and right together
  unless the mirror switch is off. A picked region appears on the brain as
  its own surface in the page's colour, the brain goes translucent around
  it, and the cut faces tint the region's voxels the same colour.
- **The atlas.** The website in a browser window: the Region Atlas, Brodmann
  areas, tractography and the rest, as they are on the web. This loads the
  live site for now; the iPhone and iPad app carries the same pages offline.

## Files

| File | Holds |
|---|---|
| `VisionAtlas/VisionAtlasApp.swift` | The four windows: console, brain volume, brain console, atlas browser. |
| `VisionAtlas/ConsoleView.swift` | The console and its buttons. |
| `VisionAtlas/BrainConsoleView.swift` | The brain's console: the six cut sliders and the region picker. |
| `VisionAtlas/Atlas.swift` | The cuts and what is highlighted, shared by the brain console and the brain window. |
| `VisionAtlas/Regions.swift` | The AAL region table, generated from the site's. |
| `VisionAtlas/BrainVolumeView.swift` | The volumetric window: RealityView and the drag, pinch and two-hand turn gestures. |
| `VisionAtlas/BrainScene.swift` | The scene: loads the data, rebuilds the cut meshes, paints the slice on each of the six cut faces. |
| `VisionAtlas/MeshClipper.swift` | Cuts a surface mesh back to the part between six planes, exactly at the planes. |
| `VisionAtlas/BrainData.swift` | Reads the data files; gunzips with the Compression framework. |
| `VisionAtlas/AtlasBrowser.swift` | The web view window. |
| `VisionAtlas/Resources/brain.mesh.gz` | The brain's outer surface, 662,148 triangles, packed. |
| `VisionAtlas/Resources/brain.vol.gz` | The MNI152 template, brain voxels only, 0.74 mm. |
| `VisionAtlas/Resources/regions.mesh.gz` | A surface for each of the 116 AAL labels, packed. |
| `VisionAtlas/Resources/aal.vol.gz` | The AAL labels, one byte per voxel, 1 mm. |

The data files and `Regions.swift` are made from `site/assets/mni152.nii.gz`,
`site/assets/aal.nii.gz` and `site/assets/atlas-data.js` by
`scripts/make-vision-assets.mjs`, using the same surface code the Region
Atlas uses for its 3D export, so the brain here is the one the website
exports. Run `npm run vision-assets` from `app/` to remake them; they only
change if the template, the atlas or the region list does, and each run
adds their size to the repository's history, so run it for a reason.

The Xcode project lists no files by hand: the `VisionAtlas` folder is a
synchronised group, so anything put in it is part of the target. The
`Info.plist` sits beside the project on purpose; inside the folder, Xcode
would copy it into the bundle as a resource as well.

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
superior. RealityKit wants metres with y up and the viewer at +z, so a point
(x, y, z) mm is placed at (−x, z, y) × scale ÷ 1000, centred on the middle
of the volume: the brain faces the viewer, its right on the viewer's left,
as a person's would. It is shown at twice life size, about a football.

The cut faces are textured quads. Their texture coordinates assume RealityKit's
convention that v = 0 is the bottom row of the image; if a slice ever shows
upside down, that assumption is the thing to flip, in `sliceQuad` in
`BrainScene.swift`. The two-hand turn gesture cannot be tried in the
simulator; if it spins the wrong way on a headset, the signs in the
`RotateGesture3D` handler in `BrainVolumeView.swift` are the thing to change.
