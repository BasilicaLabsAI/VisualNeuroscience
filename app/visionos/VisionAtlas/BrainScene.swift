import Foundation
import CoreGraphics
import RealityKit
import SwiftUI
import UIKit
import simd

/// The brain as an object in the room: the outer surface, cut back from
/// the outside in by six sliders, with the template's slice painted on each
/// cut face, and any highlighted regions or Brodmann areas as surfaces of
/// their own.
///
/// Frames: the data is in MNI millimetres (x right, y anterior, z superior).
/// RealityKit wants metres with y up and the viewer at +z, so a point
/// (x, y, z) mm becomes (−x, z, y) × scale / 1000, centred on the middle of
/// the volume: the brain faces the viewer, its right on the viewer's left,
/// as a person's would. Every entity hangs off `root`, so turning the root
/// turns everything together.
@Observable @MainActor
final class BrainScene {
    let root = Entity()
    var isLoading = true
    var errorText: String?

    /// Brain size multiplier baked into the geometry; 2 is about a football.
    private let scale: Float = 2
    private var k: Float { scale * 0.001 }

    private var mesh: BrainMesh?
    private var volume: Volume?
    private var labels: Volume?
    private var regions: RegionMeshes?
    private var brodmannLabels: Volume?
    private var brodmannMeshes: RegionMeshes?
    private var centre = SIMD3<Float>(0, 0, 0)
    private let brain = ModelEntity()
    private var skin = PhysicallyBasedMaterial()
    /// An AAL label or a Brodmann area, whichever atlas a highlight comes from.
    enum RegionKey: Hashable { case aal(Int), brodmann(Int) }
    /// One entity per highlighted label, in its selection's colour.
    private var regionEntities: [RegionKey: ModelEntity] = [:]
    private var regionMeshes: [RegionKey: BrainMesh] = [:]
    /// Six cut faces: index axis * 2 + side, side 0 the lower cut, 1 the upper.
    private let faces = (0..<6).map { _ in ModelEntity() }
    private var faceSliceIndex = [Int](repeating: -1, count: 6)
    private var faceTextures = [TextureResource?](repeating: nil, count: 6)
    private var facesVersion = -1
    private var busy = false
    private var pending = false

    init() {
        root.addChild(brain)
        for f in faces { f.isEnabled = false; root.addChild(f) }
    }

    /// The scene-frame direction of an MNI axis: right, anterior, superior.
    static func axisDirection(_ axis: Int) -> SIMD3<Float> {
        switch axis {
        case 0: return SIMD3(-1, 0, 0)
        case 1: return SIMD3(0, 0, 1)
        default: return SIMD3(0, 1, 0)
        }
    }

    // MARK: loading

    func load() async {
        do {
            let loaded = try await Task.detached(priority: .userInitiated) { () throws -> (BrainMesh, Volume, Volume, RegionMeshes, Volume, RegionMeshes) in
                let m = try BrainMesh.load(named: "brain")
                let v = try Volume.load(named: "brain")
                let a = try Volume.load(named: "aal")
                let r = try RegionMeshes(named: "regions")
                let bl = try Volume.load(named: "brodmann")
                let bm = try RegionMeshes(named: "brodmann")
                return (m, v, a, r, bl, bm)
            }.value
            mesh = loaded.0
            volume = loaded.1
            labels = loaded.2
            regions = loaded.3
            brodmannLabels = loaded.4
            brodmannMeshes = loaded.5
            centre = (loaded.1.minMm + loaded.1.maxMm) / 2

            skin.baseColor = .init(tint: UIColor(white: 0.80, alpha: 1))
            skin.roughness = 0.78
            skin.metallic = 0.0
            skin.faceCulling = .none
            let whole = try await MeshResource(from: [descriptor(positions: loaded.0.positions, normals: loaded.0.normals, indices: loaded.0.indices)])
            brain.model = ModelComponent(mesh: whole, materials: [skin])

            root.makeGrabbable(scale: k)

            isLoading = false
            selectionsChanged()
        } catch {
            errorText = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: highlighted regions

    /// Brings the region entities in line with what the console has picked:
    /// one entity per label in the selection's colour, the brain turned
    /// translucent while anything is highlighted, and a rebuild so the cuts
    /// and cut faces pick the regions up.
    func selectionsChanged() {
        guard let regions, let brodmannMeshes else { return }
        var wanted: [RegionKey: String] = [:]
        for (label, colour) in Atlas.shared.labelColours { wanted[.aal(label)] = colour }
        for (ba, colour) in Atlas.shared.brodmannColours { wanted[.brodmann(ba)] = colour }
        for (key, entity) in regionEntities where wanted[key] == nil {
            entity.removeFromParent()
            regionEntities[key] = nil
        }
        for (key, colour) in wanted where regionEntities[key] == nil {
            if regionMeshes[key] == nil {
                switch key {
                case .aal(let label): regionMeshes[key] = regions.mesh(for: label)
                case .brodmann(let ba): regionMeshes[key] = brodmannMeshes.mesh(for: ba)
                }
            }
            guard regionMeshes[key] != nil else { continue }
            var paint = PhysicallyBasedMaterial()
            paint.baseColor = .init(tint: UIColor(hex: colour))
            paint.roughness = 0.55
            paint.metallic = 0.0
            paint.faceCulling = .none
            let entity = ModelEntity()
            entity.model = ModelComponent(mesh: MeshResource.generateBox(size: 0.0001), materials: [paint])
            root.addChild(entity)
            regionEntities[key] = entity
        }
        skin.blending = wanted.isEmpty ? .opaque : .transparent(opacity: 0.25)
        brain.model?.materials = [skin]
        cutsChanged()
    }

    // MARK: cuts

    /// Rebuilds run one at a time; a change during a rebuild queues one more.
    func cutsChanged() {
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
        let cutLo = lo + (hi - lo) * Atlas.shared.cutLo
        let cutHi = lo + (hi - lo) * Atlas.shared.cutHi

        let regionInputs = regionEntities.keys.compactMap { key in regionMeshes[key].map { (key, $0) } }
        let (clipped, clippedRegions) = await Task.detached(priority: .userInitiated) { () -> (MeshClipper.Output, [RegionKey: MeshClipper.Output]) in
            var out: [RegionKey: MeshClipper.Output] = [:]
            for (key, m) in regionInputs { out[key] = MeshClipper.clip(m, lo: cutLo, hi: cutHi, limitLo: lo, limitHi: hi) }
            return (MeshClipper.clip(mesh, lo: cutLo, hi: cutHi, limitLo: lo, limitHi: hi), out)
        }.value
        for (key, part) in clippedRegions {
            guard let entity = regionEntities[key] else { continue }
            if part.indices.isEmpty { entity.isEnabled = false; continue }
            do {
                entity.model?.mesh = try await MeshResource(from: [descriptor(positions: part.positions, normals: part.normals, indices: part.indices)])
                entity.isEnabled = true
            } catch {
                errorText = error.localizedDescription
            }
        }
        do {
            brain.model?.mesh = try await MeshResource(from: [descriptor(positions: clipped.positions, normals: clipped.normals, indices: clipped.indices)])
        } catch {
            errorText = error.localizedDescription
        }

        let version = Atlas.shared.version
        var overlays: [Volume.Overlay] = []
        if let labels, !Atlas.shared.labelColours.isEmpty {
            overlays.append(Volume.Overlay(labels: labels, colours: Atlas.shared.labelColours.mapValues { SIMD3<UInt8>(hex: $0) }))
        }
        if let brodmannLabels, !Atlas.shared.brodmannColours.isEmpty {
            overlays.append(Volume.Overlay(labels: brodmannLabels, colours: Atlas.shared.brodmannColours.mapValues { SIMD3<UInt8>(hex: $0) }))
        }
        for axis in 0..<3 {
            for side in 0..<2 {
                let slot = axis * 2 + side
                let face = faces[slot]
                let open = side == 0 ? Atlas.shared.cutLo[axis] > 0.001 : Atlas.shared.cutHi[axis] < 0.999
                guard open else { face.isEnabled = false; continue }
                let at = side == 0 ? cutLo[axis] : cutHi[axis]
                do {
                    let index = volume.index(axis: axis, mm: at)
                    if faceSliceIndex[slot] != index || faceTextures[slot] == nil || facesVersion != version {
                        guard let image = volume.sliceImage(axis: axis, at: index, overlays: overlays) else { continue }
                        faceTextures[slot] = try await TextureResource(image: image, options: .init(semantic: .color))
                        faceSliceIndex[slot] = index
                    }
                    guard let texture = faceTextures[slot] else { continue }
                    var paint = UnlitMaterial()
                    paint.color = .init(tint: .white, texture: .init(texture))
                    paint.blending = .transparent(opacity: 1.0)
                    paint.opacityThreshold = 0.5
                    paint.faceCulling = .none
                    let quad = sliceQuad(axis: axis, side: side, at: at, cutLo: cutLo, cutHi: cutHi, lo: lo, hi: hi)
                    face.model = ModelComponent(mesh: try await MeshResource(from: [quad]), materials: [paint])
                    face.isEnabled = true
                } catch {
                    errorText = error.localizedDescription
                }
            }
        }
        facesVersion = version
    }

    // MARK: geometry

    private func toScene(_ p: SIMD3<Float>) -> SIMD3<Float> {
        let q = p - centre
        return SIMD3(-q.x, q.z, q.y) * k
    }

    private func descriptor(positions: [SIMD3<Float>], normals: [SIMD3<Float>], indices: [UInt32]) -> MeshDescriptor {
        var d = MeshDescriptor(name: "brain")
        d.positions = MeshBuffer(positions.map(toScene))
        d.normals = MeshBuffer(normals.map { SIMD3(-$0.x, $0.z, $0.y) })
        d.primitives = .triangles(indices)
        return d
    }

    /// The face of one cut: a rectangle in the cut plane, trimmed to the
    /// cuts on the other two axes, with texture coordinates that put the
    /// slice image's left edge at the axis minimum and its top row at the
    /// maximum of the vertical axis (z for the sagittal and coronal faces,
    /// y for the axial). It sits a hair inside the cut, so the surface's
    /// edge never fights it.
    private func sliceQuad(axis: Int, side: Int, at: Float, cutLo: SIMD3<Float>, cutHi: SIMD3<Float>, lo: SIMD3<Float>, hi: SIMD3<Float>) -> MeshDescriptor {
        let u = axis == 0 ? 1 : 0          // horizontal axis of the image
        let v = axis == 2 ? 1 : 2          // vertical axis of the image
        let u0 = max(cutLo[u], lo[u]), u1 = min(cutHi[u], hi[u])
        let v0 = max(cutLo[v], lo[v]), v1 = min(cutHi[v], hi[v])
        let fu0 = (u0 - lo[u]) / (hi[u] - lo[u]), fu1 = (u1 - lo[u]) / (hi[u] - lo[u])
        let fv0 = (v0 - lo[v]) / (hi[v] - lo[v]), fv1 = (v1 - lo[v]) / (hi[v] - lo[v])
        let inside = side == 0 ? at + 0.05 : at - 0.05

        func corner(_ a: Float, _ b: Float) -> SIMD3<Float> {
            var p = SIMD3<Float>(0, 0, 0)
            p[axis] = inside; p[u] = a; p[v] = b
            return toScene(p)
        }
        let n = Self.axisDirection(axis) * (side == 0 ? -1 : 1)

        var d = MeshDescriptor(name: "slice\(axis)\(side)")
        d.positions = MeshBuffer([corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)])
        d.normals = MeshBuffer([n, n, n, n])
        d.textureCoordinates = MeshBuffer([SIMD2(fu0, fv0), SIMD2(fu1, fv0), SIMD2(fu1, fv1), SIMD2(fu0, fv1)])
        d.primitives = .triangles([0, 1, 2, 0, 2, 3])
        return d
    }
}

extension Volume {
    /// A label volume and the colours of the labels to paint.
    struct Overlay {
        let labels: Volume
        let colours: [Int: SIMD3<UInt8>]
    }

    /// One slice as an RGBA image, opaque where there is brain and clear
    /// elsewhere, rows running from the top of the brain (or the front, for
    /// an axial slice) downwards. Voxels whose label is in an overlay are
    /// tinted at 90 %, as the Region Atlas overlays them.
    func sliceImage(axis: Int, at index: Int, overlays: [Overlay] = []) -> CGImage? {
        let X = dims.x, Y = dims.y, Z = dims.z
        let w = axis == 0 ? Y : X
        let h = axis == 2 ? Y : Z
        let i = max(0, min(dims[axis] - 1, index))
        var px = [UInt8](repeating: 0, count: w * h * 4)
        for row in 0..<h {
            for col in 0..<w {
                let vox: SIMD3<Int>
                switch axis {
                case 0:  vox = SIMD3(i, col, Z - 1 - row)
                case 1:  vox = SIMD3(col, i, Z - 1 - row)
                default: vox = SIMD3(col, Y - 1 - row, i)
                }
                let value = data[(vox.z * Y + vox.y) * X + vox.x]
                guard value > 0 else { continue }
                let o = (row * w + col) * 4
                let g = UInt8(min(255, Int(value) * 5 / 4))
                px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = 255
                if !overlays.isEmpty {
                    let mm = origin + SIMD3<Float>(Float(vox.x), Float(vox.y), Float(vox.z)) * spacing
                    for overlay in overlays {
                        guard let c = overlay.colours[Int(overlay.labels.value(atMm: mm))] else { continue }
                        px[o] = UInt8((Int(c.x) * 9 + Int(g)) / 10)
                        px[o + 1] = UInt8((Int(c.y) * 9 + Int(g)) / 10)
                        px[o + 2] = UInt8((Int(c.z) * 9 + Int(g)) / 10)
                        break
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
