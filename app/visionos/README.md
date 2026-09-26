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
  it, and the cut faces tint the region's voxels the same colour. Picking a
  region opens **What they do**, a window that lists every highlighted
  region in its colour with its function, stacked by layer as the page does.
  There is only ever one: picking another region adds it to that window,
  wherever it has been moved, and brings it forward. The brain console and
  the Brodmann window are single windows in the same way.
- **Brodmann areas.** The 41 areas as the site lists them, searchable by
  function, name or number and grouped by lobe. Tapping an area opens its
  function and caveat; ticking it picks it. With **Show on the brain** on,
  the picked areas are drawn on the brain and on the cut faces in their
  colours, and appear in the What they do window.
- **Tractography.** A second volumetric window with a sample of the HCP1065
  streamlines as thin tubes coloured by direction, the brain's surface
  faintly around them, turning and sizing like the brain.

## Files

| File | Holds |
|---|---|
| `VisionAtlas/VisionAtlasApp.swift` | The windows: console, brain, brain console, notes, Brodmann, tractography. |
| `VisionAtlas/ConsoleView.swift` | The console and its buttons. |
| `VisionAtlas/BrainConsoleView.swift` | The brain's console: the six cut sliders and the region picker. |
| `VisionAtlas/RegionNotesView.swift` | What the highlighted regions and areas do, in their colours. |
| `VisionAtlas/BrodmannConsoleView.swift` | The Brodmann list, search, and the switch that puts picks on the brain. |
| `VisionAtlas/Atlas.swift` | The cuts and what is highlighted, shared by every window. |
| `VisionAtlas/Generated.swift` | The region, note, Brodmann and frame tables, generated from the site's. |
| `VisionAtlas/BrainVolumeView.swift` | The brain's volumetric window. |
| `VisionAtlas/BrainScene.swift` | The brain scene: loads the data, rebuilds the cut meshes, paints the slice on each of the six cut faces. |
| `VisionAtlas/Tracts.swift` | The tractography scene and its window. |
| `VisionAtlas/Turnable.swift` | The drag, pinch and two-hand turn gestures every object answers to. |
| `VisionAtlas/MeshClipper.swift` | Cuts a surface mesh back to the part between six planes, exactly at the planes. |
| `VisionAtlas/BrainData.swift` | Reads the data files; gunzips with the Compression framework. |
| `VisionAtlas/Resources/brain.mesh.gz` | The brain's outer surface, 662,148 triangles, packed. |
| `VisionAtlas/Resources/brain.vol.gz` | The MNI152 template, brain voxels only, 0.74 mm. |
| `VisionAtlas/Resources/regions.mesh.gz` | A surface for each of the 116 AAL labels, packed. |
| `VisionAtlas/Resources/aal.vol.gz` | The AAL labels, one byte per voxel, 1 mm. |
| `VisionAtlas/Resources/brodmann.mesh.gz` | A surface for each of the 41 Brodmann areas, packed. |
| `VisionAtlas/Resources/brodmann.vol.gz` | The Brodmann labels, one byte per voxel, 1 mm. |
| `VisionAtlas/Resources/tracts.mesh.gz` | 4,000 HCP1065 streamlines as tubes, one mesh per direction colour. |

The data files and `Generated.swift` are made from the site's template,
atlases, tractogram and region tables by `scripts/make-vision-assets.mjs`,
using the same surface code the Region Atlas uses for its 3D export, so
everything in the room is what the website draws. Run `npm run vision-assets`
from `app/` to remake them; they only change if the site's data does, and
each run adds their size to the repository's history, so run it for a reason.

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
