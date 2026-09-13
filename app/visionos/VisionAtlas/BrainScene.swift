import Foundation
import CoreGraphics
import RealityKit
import SwiftUI
import UIKit
import simd

/// The brain as an object in the room: the outer surface, cut back by three
/// sliders, with the template's slice painted on each cut face.
///
/// Frames: the data is in MNI millimetres (x right, y anterior, z superior).
/// RealityKit wants metres with y up, so a point (x, y, z) mm becomes
/// (x, z, −y) × scale / 1000, centred on the middle of the volume.
@Observable @MainActor
final class BrainScene {
    /// The entity the RealityView shows; everything hangs off it.
    let root = Entity()

    /// Fraction of each MNI axis kept, 1 = whole brain. x: right side, y: front, z: top.
    var cut = SIMD3<Float>(1, 1, 1)
    /// Brain size multiplier; 2 makes it about the size of a football.
    var scale: Float = 2
    var isLoading = true
    var errorText: String?

    private var mesh: BrainMesh?
    private var volume: Volume?
    private var centre = SIMD3<Float>(0, 0, 0)
    private let brain = ModelEntity()
    private let planes = [ModelEntity(), ModelEntity(), ModelEntity()]
    private var planeSliceIndex = [-1, -1, -1]
    private var planeTextures: [TextureResource?] = [nil, nil, nil]
    private var busy = false
    private var pending = false

    var dragStart = simd_quatf(angle: 0, axis: [0, 1, 0])

    init() {
        root.addChild(brain)
        for p in planes { p.isEnabled = false; root.addChild(p) }
    }

    // MARK: loading

    func load() async {
        do {
            let loaded = try await Task.detached(priority: .userInitiated) { () throws -> (BrainMesh, Volume) in
                let m = try BrainMesh.load(named: "brain")
                let v = try Volume.load(named: "brain")
                return (m, v)
            }.value
            mesh = loaded.0
            volume = loaded.1
            centre = (loaded.1.minMm + loaded.1.maxMm) / 2

            var skin = PhysicallyBasedMaterial()
            skin.baseColor = .init(tint: UIColor(red: 0.86, green: 0.83, blue: 0.80, alpha: 1))
            skin.roughness = 0.6
            skin.metallic = 0
            skin.faceCulling = .none
            let whole = try await MeshResource(from: [descriptor(for: loaded.0)])
            brain.model = ModelComponent(mesh: whole, materials: [skin])

            // A box the size of the brain so the drag gesture has something to hit.
            let extent = (loaded.1.maxMm - loaded.1.minMm) * scale * 0.001
            root.components.set(CollisionComponent(shapes: [.generateBox(size: SIMD3(extent.x, extent.z, extent.y))]))
            root.components.set(InputTargetComponent())

            isLoading = false
            await rebuild()
        } catch {
            errorText = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: cuts

    /// Called whenever a slider moves. Rebuilds run one at a time; a move
    /// during a rebuild queues exactly one more.
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

        let clipped = await Task.detached(priority: .userInitiated) {
            MeshClipper.clip(mesh, keepBelow: cutMm, limit: hi)
        }.value
        do {
            let d = descriptor(positions: clipped.positions, normals: clipped.normals, indices: clipped.indices)
            brain.model?.mesh = try await MeshResource(from: [d])
        } catch {
            errorText = error.localizedDescription
        }

        for axis in 0..<3 {
            let plane = planes[axis]
            guard cut[axis] < 0.999 else { plane.isEnabled = false; continue }
            do {
                let index = volume.index(axis: axis, mm: cutMm[axis])
                if planeSliceIndex[axis] != index || planeTextures[axis] == nil {
                    guard let image = volume.sliceImage(axis: axis, at: index) else { continue }
                    planeTextures[axis] = try await TextureResource(image: image, options: .init(semantic: .color))
                    planeSliceIndex[axis] = index
                }
                guard let texture = planeTextures[axis] else { continue }
                var paint = UnlitMaterial()
                paint.color = .init(tint: .white, texture: .init(texture))
                paint.blending = .transparent(opacity: 1.0)
                paint.opacityThreshold = 0.5
                paint.faceCulling = .none
                let face = try await MeshResource(from: [sliceQuad(axis: axis, cutMm: cutMm, lo: lo, hi: hi)])
                plane.model = ModelComponent(mesh: face, materials: [paint])
                plane.isEnabled = true
            } catch {
                errorText = error.localizedDescription
            }
        }
    }

    // MARK: geometry

    private func toScene(_ p: SIMD3<Float>) -> SIMD3<Float> {
        let q = p - centre
        return SIMD3(q.x, q.z, -q.y) * (scale * 0.001)
    }

    private func descriptor(for m: BrainMesh) -> MeshDescriptor {
        descriptor(positions: m.positions, normals: m.normals, indices: m.indices)
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
        var normal = SIMD3<Float>(0, 0, 0); normal[axis] = 1
        let n = SIMD3(normal.x, normal.z, -normal.y)

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
    func sliceImage(axis: Int, at index: Int) -> CGImage? {
        let X = dims.x, Y = dims.y, Z = dims.z
        let w = axis == 0 ? Y : X
        let h = axis == 2 ? Y : Z
        let i = max(0, min(dims[axis] - 1, index))
        var px = [UInt8](repeating: 0, count: w * h * 4)
        for row in 0..<h {
            for col in 0..<w {
                let value: UInt8
                switch axis {
                case 0:  value = data[((Z - 1 - row) * Y + col) * X + i]
                case 1:  value = data[((Z - 1 - row) * Y + i) * X + col]
                default: value = data[(i * Y + (Y - 1 - row)) * X + col]
                }
                guard value > 0 else { continue }
                let o = (row * w + col) * 4
                let g = UInt8(min(255, Int(value) * 5 / 4))
                px[o] = g; px[o + 1] = g; px[o + 2] = g; px[o + 3] = 255
            }
        }
        guard let provider = CGDataProvider(data: Data(px) as CFData) else { return nil }
        return CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4,
                       space: CGColorSpaceCreateDeviceRGB(),
                       bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
                       provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent)
    }
}
