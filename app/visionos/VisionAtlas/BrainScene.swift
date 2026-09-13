import Foundation
import CoreGraphics
import RealityKit
import SwiftUI
import UIKit
import simd

/// The brain as an object in the room: the outer surface, cut back by three
/// slice panes, with the template's slice painted on each cut face.
///
/// Frames: the data is in MNI millimetres (x right, y anterior, z superior).
/// RealityKit wants metres with y up, so a point (x, y, z) mm becomes
/// (x, z, −y) × scale / 1000, centred on the middle of the volume. Every
/// entity hangs off `root`, so turning the root turns the brain, the cut
/// faces and the panes together.
@Observable @MainActor
final class BrainScene {
    let root = Entity()

    /// Fraction of each MNI axis kept, 1 = whole brain. x: right side, y: front, z: top.
    var cut = SIMD3<Float>(1, 1, 1)
    /// The tinted panes that show where each cut sits and can be dragged.
    var panesOn = false
    var isLoading = true
    var errorText: String?

    /// Brain size multiplier baked into the geometry; 2 is about a football.
    private let scale: Float = 2
    private var k: Float { scale * 0.001 }

    private var mesh: BrainMesh?
    private var volume: Volume?
    private var labels: Volume?
    private var regions: RegionMeshes?
    private var centre = SIMD3<Float>(0, 0, 0)
    private let brain = ModelEntity()
    private var skin = PhysicallyBasedMaterial()
    /// One entity per highlighted AAL label, keyed by label.
    private var regionEntities: [Int: ModelEntity] = [:]
    private var regionMeshes: [Int: BrainMesh] = [:]
    private var facesVersion = -1
    private let faces = [ModelEntity(), ModelEntity(), ModelEntity()]
    private let sheets = [ModelEntity(), ModelEntity(), ModelEntity()]
    private var faceSliceIndex = [-1, -1, -1]
    private var faceTextures: [TextureResource?] = [nil, nil, nil]
    private var busy = false
    private var pending = false

    init() {
        root.addChild(brain)
        for f in faces { f.isEnabled = false; root.addChild(f) }
        for s in sheets { s.isEnabled = false; root.addChild(s) }
    }

    /// The scene-frame direction of an MNI axis: right, anterior, superior.
    static func axisDirection(_ axis: Int) -> SIMD3<Float> {
        switch axis {
        case 0: return SIMD3(1, 0, 0)
        case 1: return SIMD3(0, 0, -1)
        default: return SIMD3(0, 1, 0)
        }
    }

    // MARK: loading

    func load() async {
        do {
            let loaded = try await Task.detached(priority: .userInitiated) { () throws -> (BrainMesh, Volume, Volume, RegionMeshes) in
                let m = try BrainMesh.load(named: "brain")
                let v = try Volume.load(named: "brain")
                let a = try Volume.load(named: "aal")
                let r = try RegionMeshes(named: "regions")
                return (m, v, a, r)
            }.value
            mesh = loaded.0
            volume = loaded.1
            labels = loaded.2
            regions = loaded.3
            centre = (loaded.1.minMm + loaded.1.maxMm) / 2

            skin.baseColor = .init(tint: UIColor(white: 0.80, alpha: 1))
            skin.roughness = 0.78
            skin.metallic = 0.0
            skin.faceCulling = .none
            let whole = try await MeshResource(from: [descriptor(positions: loaded.0.positions, normals: loaded.0.normals, indices: loaded.0.indices)])
            brain.model = ModelComponent(mesh: whole, materials: [skin])
            brain.components.set(InputTargetComponent())

            for axis in 0..<3 { try await makeSheet(axis: axis, lo: loaded.1.minMm, hi: loaded.1.maxMm) }

            isLoading = false
            selectionsChanged()
        } catch {
            errorText = error.localizedDescription
            isLoading = false
        }
    }

    /// A pane is a translucent tinted sheet across the whole volume in its
    /// cut plane, built once at the volume's centre and moved along its axis
    /// as the cut moves. It has a thin collision box so it can be grabbed
    /// where it sticks out beyond the brain.
    private func makeSheet(axis: Int, lo: SIMD3<Float>, hi: SIMD3<Float>) async throws {
        let sheet = sheets[axis]
        var at = centre
        var d = MeshDescriptor(name: "pane\(axis)")
        let u = axis == 0 ? 1 : 0, v = axis == 2 ? 1 : 2
        func corner(_ a: Float, _ b: Float) -> SIMD3<Float> { at[u] = a; at[v] = b; return toScene(at) }
        let n = Self.axisDirection(axis)
        d.positions = MeshBuffer([corner(lo[u], lo[v]), corner(hi[u], lo[v]), corner(hi[u], hi[v]), corner(lo[u], hi[v])])
        d.normals = MeshBuffer([n, n, n, n])
        d.primitives = .triangles([0, 1, 2, 0, 2, 3])

        var tint = UnlitMaterial()
        tint.color = .init(tint: UIColor(red: 0.36, green: 0.64, blue: 1.0, alpha: 1))
        tint.blending = .transparent(opacity: 0.26)
        tint.faceCulling = .none
        sheet.model = ModelComponent(mesh: try await MeshResource(from: [d]), materials: [tint])

        var size = (hi - lo) * k
        size[axis] = 0.006
        let box = ShapeResource.generateBox(size: SIMD3(size.x, size.z, size.y))
        sheet.components.set(CollisionComponent(shapes: [box]))
        sheet.components.set(InputTargetComponent())
    }

    // MARK: interaction

    /// Which pane an entity is, if it is one.
    func paneAxis(of entity: Entity) -> Int? {
        sheets.firstIndex { $0 == entity }
    }

    /// Slides a pane to where a drag has taken it. `movement` is the drag so
    /// far in scene metres; only its component along the pane's normal
    /// counts, and the brain's own turn and size are taken out.
    func slide(axis: Int, from start: Float, by movement: SIMD3<Float>) {
        guard let volume else { return }
        let normal = root.orientation.act(Self.axisDirection(axis))
        let metres = simd_dot(movement, normal)
        let mm = metres / (k * max(root.scale.x, 0.01))
        let span = volume.maxMm[axis] - volume.minMm[axis]
        setCut(axis: axis, fraction: start + mm / span)
    }

    func setCut(axis: Int, fraction: Float) {
        let f = max(0.02, min(1, fraction))
        guard f != cut[axis] else { return }
        cut[axis] = f
        placeSheet(axis: axis)
        cutChanged()
    }

    func showWholeBrain() {
        cut = SIMD3(1, 1, 1)
        for axis in 0..<3 { placeSheet(axis: axis) }
        cutChanged()
    }

    func panesChanged() {
        for s in sheets { s.isEnabled = panesOn && !isLoading }
    }

    /// The pane sits a hair on the far side of the cut, so the cut face
    /// covers it where there is brain and the tint shows only around it.
    private func placeSheet(axis: Int) {
        guard let volume else { return }
        let lo = volume.minMm, hi = volume.maxMm
        let mm = lo[axis] + (hi[axis] - lo[axis]) * cut[axis] + 0.05
        sheets[axis].position = Self.axisDirection(axis) * ((mm - centre[axis]) * k)
    }

    // MARK: highlighted regions

    /// Brings the region entities in line with what the console has picked:
    /// one entity per label in the selection's colour, the brain turned
    /// translucent while anything is highlighted, and a rebuild so the cuts
    /// and cut faces pick the regions up.
    func selectionsChanged() {
        guard let regions else { return }
        let wanted = Atlas.shared.labelColours
        for (label, entity) in regionEntities where wanted[label] == nil {
            entity.removeFromParent()
            regionEntities[label] = nil
        }
        for (label, colour) in wanted where regionEntities[label] == nil {
            if regionMeshes[label] == nil { regionMeshes[label] = regions.mesh(for: label) }
            guard regionMeshes[label] != nil else { continue }
            var paint = PhysicallyBasedMaterial()
            paint.baseColor = .init(tint: UIColor(hex: colour))
            paint.roughness = 0.55
            paint.metallic = 0.0
            paint.faceCulling = .none
            let entity = ModelEntity()
            entity.model = ModelComponent(mesh: MeshResource.generateBox(size: 0.0001), materials: [paint])
            root.addChild(entity)
            regionEntities[label] = entity
        }
        skin.blending = wanted.isEmpty ? .opaque : .transparent(opacity: 0.25)
        brain.model?.materials = [skin]
        cutChanged()
    }

    // MARK: cuts

    /// Rebuilds run one at a time; a change during a rebuild queues one more.
    func cutChanged() {
        pending = true
        Task { await drain() }
    }

    private func drain() async {
        guard !busy else { return }
        busy = true
        while pending {
            pending = false
            await rebuild()
        }
        busy = false
    }

    private func rebuild() async {
        guard let mesh, let volume else { return }
        let lo = volume.minMm, hi = volume.maxMm
        let cutMm = lo + (hi - lo) * cut

        let regionInputs = regionEntities.keys.compactMap { label in regionMeshes[label].map { (label, $0) } }
        let (clipped, clippedRegions) = await Task.detached(priority: .userInitiated) { () -> (MeshClipper.Output, [Int: MeshClipper.Output]) in
            var out: [Int: MeshClipper.Output] = [:]
            for (label, m) in regionInputs { out[label] = MeshClipper.clip(m, keepBelow: cutMm, limit: hi) }
            return (MeshClipper.clip(mesh, keepBelow: cutMm, limit: hi), out)
        }.value
        for (label, part) in clippedRegions {
            guard let entity = regionEntities[label] else { continue }
            if part.indices.isEmpty { entity.isEnabled = false; continue }
            do {
                entity.model?.mesh = try await MeshResource(from: [descriptor(positions: part.positions, normals: part.normals, indices: part.indices)])
                entity.isEnabled = true
            } catch {
                errorText = error.localizedDescription
            }
        }
        do {
            let d = descriptor(positions: clipped.positions, normals: clipped.normals, indices: clipped.indices)
            let resource = try await MeshResource(from: [d])
            brain.model?.mesh = resource
            // the brain is grabbed by its own shape, so a pane can be caught
            // wherever the cut has exposed it
            brain.components.set(CollisionComponent(shapes: [try await ShapeResource.generateConvex(from: resource)]))
        } catch {
            errorText = error.localizedDescription
        }

        for axis in 0..<3 {
            let face = faces[axis]
            guard cut[axis] < 0.999 else { face.isEnabled = false; continue }
            do {
                let index = volume.index(axis: axis, mm: cutMm[axis])
                let version = Atlas.shared.version
                if faceSliceIndex[axis] != index || faceTextures[axis] == nil || facesVersion != version {
                    let colours = Atlas.shared.labelColours.mapValues { SIMD3<UInt8>(hex: $0) }
                    guard let image = volume.sliceImage(axis: axis, at: index, labels: labels, colours: colours) else { continue }
                    faceTextures[axis] = try await TextureResource(image: image, options: .init(semantic: .color))
                    faceSliceIndex[axis] = index
                    facesVersion = version
                }
                guard let texture = faceTextures[axis] else { continue }
                var paint = UnlitMaterial()
                paint.color = .init(tint: .white, texture: .init(texture))
                paint.blending = .transparent(opacity: 1.0)
                paint.opacityThreshold = 0.5
                paint.faceCulling = .none
                face.model = ModelComponent(mesh: try await MeshResource(from: [sliceQuad(axis: axis, cutMm: cutMm, lo: lo, hi: hi)]), materials: [paint])
                face.isEnabled = true
            } catch {
                errorText = error.localizedDescription
            }
        }
        for axis in 0..<3 { placeSheet(axis: axis) }
        panesChanged()
    }

    // MARK: geometry

    private func toScene(_ p: SIMD3<Float>) -> SIMD3<Float> {
        let q = p - centre
        return SIMD3(q.x, q.z, -q.y) * k
    }

    private func descriptor(positions: [SIMD3<Float>], normals: [SIMD3<Float>], indices: [UInt32]) -> MeshDescriptor {
        var d = MeshDescriptor(name: "brain")
        d.positions = MeshBuffer(positions.map(toScene))
        d.normals = MeshBuffer(normals.map { SIMD3($0.x, $0.z, -$0.y) })
        d.primitives = .triangles(indices)
        return d
    }

    /// The face of one cut: a rectangle in the cut plane, trimmed to the
    /// other two cuts, with texture coordinates that put the slice image's
    /// left edge at the axis minimum and its top row at the maximum of the
    /// vertical axis (z for the sagittal and coronal faces, y for the axial).
    private func sliceQuad(axis: Int, cutMm: SIMD3<Float>, lo: SIMD3<Float>, hi: SIMD3<Float>) -> MeshDescriptor {
        let u = axis == 0 ? 1 : 0          // horizontal axis of the image
        let v = axis == 2 ? 1 : 2          // vertical axis of the image
        let uMax = min(cutMm[u], hi[u]), vMax = min(cutMm[v], hi[v])
        let fu = (uMax - lo[u]) / (hi[u] - lo[u]), fv = (vMax - lo[v]) / (hi[v] - lo[v])
        let at = cutMm[axis] - 0.05        // a hair inside the cut, so the surface's edge never fights it

        func corner(_ a: Float, _ b: Float) -> SIMD3<Float> {
            var p = SIMD3<Float>(0, 0, 0)
            p[axis] = at; p[u] = a; p[v] = b
            return toScene(p)
        }
        let n = Self.axisDirection(axis)

        var d = MeshDescriptor(name: "slice\(axis)")
        d.positions = MeshBuffer([corner(lo[u], lo[v]), corner(uMax, lo[v]), corner(uMax, vMax), corner(lo[u], vMax)])
        d.normals = MeshBuffer([n, n, n, n])
        d.textureCoordinates = MeshBuffer([SIMD2(0, 0), SIMD2(fu, 0), SIMD2(fu, fv), SIMD2(0, fv)])
        d.primitives = .triangles([0, 1, 2, 0, 2, 3])
        return d
    }
}

extension Volume {
    /// One slice as an RGBA image, opaque where there is brain and clear
    /// elsewhere, rows running from the top of the brain (or the front, for
    /// an axial slice) downwards.
    /// Where `labels` and `colours` are given, voxels whose label is in
    /// `colours` are tinted at 90 %, as the Region Atlas overlays them.
    func sliceImage(axis: Int, at index: Int, labels: Volume? = nil, colours: [Int: SIMD3<UInt8>] = [:]) -> CGImage? {
        let X = dims.x, Y = dims.y, Z = dims.z
        let w = axis == 0 ? Y : X
        let h = axis == 2 ? Y : Z
        let i = max(0, min(dims[axis] - 1, index))
        let overlay = labels != nil && !colours.isEmpty
        var px = [UInt8](repeating: 0, count: w * h * 4)
        for row in 0..<h {
            for col in 0..<w {
                let value: UInt8
                var vox = SIMD3<Int>(0, 0, 0)
                switch axis {
                case 0:  vox = SIMD3(i, col, Z - 1 - row)
                case 1:  vox = SIMD3(col, i, Z - 1 - row)
                default: vox = SIMD3(col, Y - 1 - row, i)
                }
                value = data[(vox.z * Y + vox.y) * X + vox.x]
                guard value > 0 else { continue }
                let o = (row * w + col) * 4
                let g = UInt8(min(255, Int(value) * 5 / 4))
                px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = 255
                if overlay, let labels {
                    let mm = origin + SIMD3<Float>(Float(vox.x), Float(vox.y), Float(vox.z)) * spacing
                    if let c = colours[Int(labels.value(atMm: mm))] {
                        px[o] = UInt8((Int(c.x) * 9 + Int(g)) / 10)
                        px[o + 1] = UInt8((Int(c.y) * 9 + Int(g)) / 10)
                        px[o + 2] = UInt8((Int(c.z) * 9 + Int(g)) / 10)
                    }
                }
            }
        }
        guard let provider = CGDataProvider(data: Data(px) as CFData) else { return nil }
        return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4,
                       space: CGColorSpaceCreateDeviceRGB(),
                       bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                       provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
    }
}
