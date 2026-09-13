# The Apple Vision Pro app

`VisionAtlas.xcodeproj` is a native visionOS app, separate from the Capacitor
shell in `ios/`. The iPad app runs on Vision Pro as a flat window; this one
puts the brain in the room.

## What it does

It opens on a **console**, a small window with one button per thing the app
can show, and the region picker:

- **The brain.** A volumetric window with the MNI152 brain as an object you
  can walk around. Drag it to turn it any way you like, pinch to size it.
  With **Slice panes** on, three translucent panes sit in the brain, one per
  MNI axis; drag a pane by the part that sticks out and the cut slides
  through the brain, the cut face showing the template's MRI slice at that
  position. The three cuts combine, so two or three together take a corner
  out. The surface is the one the Region Atlas renders, at full resolution.
- **Highlight regions.** The console's picker lists the AAL-116 regions as
  the Region Atlas does, grouped by lobe, left and right together unless the
  mirror switch is off. A picked region appears on the brain as its own
  surface in the page's colour, the brain goes translucent around it, and
  the cut faces tint the region's voxels the same colour.
- **The atlas.** The website in a browser window: the Region Atlas, Brodmann
  areas, tractography and the rest, as they are on the web. This loads the
  live site for now; the iPhone and iPad app carries the same pages offline.

## Files

| File | Holds |
|---|---|
| `VisionAtlas/VisionAtlasApp.swift` | The three windows: console, brain volume, atlas browser. |
| `VisionAtlas/ConsoleView.swift` | The console, its buttons and the region picker. |
| `VisionAtlas/Atlas.swift` | What is highlighted, shared by the console and the brain window. |
| `VisionAtlas/Regions.swift` | The AAL region table, generated from the site's. |
| `VisionAtlas/BrainVolumeView.swift` | The volumetric window: RealityView, the drag, pinch and pane gestures. |
| `VisionAtlas/BrainScene.swift` | The scene: loads the data, rebuilds the cut meshes, paints the slice on each cut face, places the panes. |
| `VisionAtlas/MeshClipper.swift` | Cuts a surface mesh back to the kept part, exactly at the planes. |
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
superior. RealityKit wants metres with y up, so a point (x, y, z) mm is
placed at (x, z, −y) × scale ÷ 1000, centred on the middle of the volume. The
brain is shown at twice life size, which is about a football.

The cut faces are textured quads. Their texture coordinates assume RealityKit's
convention that v = 0 is the bottom row of the image; if a slice ever shows
upside down, that assumption is the thing to flip, in `sliceQuad` in
`BrainScene.swift`.
