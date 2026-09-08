# 3D export and saved models

Every page that draws the brain in three dimensions can write what it is
showing as a model file, and the Region Atlas can keep named views in the
account. Both live in the rail: an **Export** card with a format picker,
and on the Region Atlas a **Saved models** card.

## What each page exports

| Page | Parts in the file |
|---|---|
| Region Atlas | Each highlighted region as a closed surface in its own colour, named as on the page (`Hippocampus (L+R)`), plus the brain's outer surface at 25 % opacity if ticked. With nothing highlighted, the brain surface alone. |
| Brodmann Areas | The picked area as a surface (lobe colour); the border graph as a sphere at each area's centre of mass, coloured by lobe, joined by tubes whose thickness follows the measured border length; the brain surface. Each is optional. |
| Network Atlas | Every region with an atlas parcel as a surface in its ring colour, regions without one (VTA, locus coeruleus, ventral striatum) as spheres at their coordinates, and the couplings of the state showing as tubes between region centres, solid where they strengthen and grey where they fall quiet. Opacity follows the emphasis on screen. |
| Visualising Studies (hallucinations) | The ten regions of the model as surfaces, faded where the state has them fall back; the brain surface. |
| Tractography | An even sample of the streamlines (1,000, 5,000 or 20,000) as polylines coloured by direction, or in the single accent colour if that view is on. |

The geometry is made in the browser from the same voxels the viewer is
drawing (`site/assets/export3d.js`). Label surfaces come from a naive
surface-nets pass over a binomially blurred mask, so they are smooth,
closed and outward-facing at the voxel boundary; a Newton step puts each
vertex on the iso-level. The brain surface is the template thresholded at
42 % of its 98th-percentile intensity, reduced to its largest connected
piece, at a 3-voxel stride so the file stays a few megabytes.

## Formats

| Format | Ext | Frame | Notes |
|---|---|---|---|
| glTF 2.0 binary | .glb | metres, Y up | Blender, three.js, Unity, Unreal, Windows 3D Viewer, Sketchfab. Streamlines as `LINES` with `KHR_materials_unlit`. Vertex colours as `COLOR_0`. |
| USDZ | .usdz | millimetres declared (`metersPerUnit = 0.001`), Y up | Apple AR Quick Look from Files on iPhone, iPad, Vision Pro and Mac. A `usda` layer in a 64-byte-aligned stored zip; `UsdPreviewSurface` materials, vertex colours through `UsdPrimvarReader_float3`. No line primitive, so streamlines become three-sided tubes and the count is capped at 1,500. |
| Wavefront OBJ | .zip | millimetres, Y up | `model.obj` + `model.mtl` + `README.txt`. Streamlines as `l` polylines; vertex colours as the `v x y z r g b` extension. |
| STL (binary) | .stl | millimetres, MNI axes | One solid, no colour. Streamlines become tubes, capped at 1,500. |
| PLY (binary) | .ply | millimetres, MNI axes | Vertex normals and RGBA colours; faces; `edge` elements for streamlines. |
| VRML 2.0 | .wrl | millimetres, Y up | `IndexedFaceSet` / `IndexedLineSet`, colour per vertex where present. |
| X3D | .x3d | millimetres, Y up | The same as XML, X3D 3.3 Immersive profile. |

"Y up" means MNI (x, y, z) is written as (x, z, −y): the subject's right
stays +x, superior becomes +y, anterior becomes −z, which is what glTF,
USD, VRML and most viewers expect, so the brain stands upright on open.
STL and PLY keep MNI millimetres untouched because the tools that read
them are the scientific ones.

Inside the native apps the file goes to the app's Documents folder and
straight onto the share sheet (`MN.saveFile` in `native.js`), which is how
it reaches Files, AirDrop or another app; on the web it downloads.

## Saved models

`site/assets/models.js`. A model is whatever the page's `capture()`
returns; for the Region Atlas that is the highlighted regions with their
colours, the overlay opacity, the layout, the 3D camera (azimuth,
elevation, zoom), the crosshair and the slice-tool cuts. Signed out,
models live in `localStorage` under `vn-models-regions`. Signed in, they
are account files at `users/{uid}/tools/regions/files/{name}` through
`userdata.js`, the same store Practice uses for progress, under the
owner-only Firestore rules. On the first login after saving on a device,
the device's models move into the account, name by name, skipping any
name the account already has. A save the account refuses is kept on the
device and the note under the list says so.

## Verifying

`scratchpad` tests, run headlessly with Playwright: a Node unit test of
the surface extractor (a voxel sphere and cube come back as closed
manifolds with outward normals within a few percent of their voxel
volume) and every writer's structure (GLB chunks and accessors, STL
counts, PLY element sizes, OBJ/USDZ zip entries and 64-byte alignment,
well-formed X3D); then each page exporting through its own controls, with
the downloads parsed.
