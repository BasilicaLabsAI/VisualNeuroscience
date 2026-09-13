import SwiftUI
import RealityKit
import UIKit
import simd

/// The HCP1065 tractogram in the room: a sample of its streamlines as thin
/// tubes coloured by direction, red left–right, green front–back, blue
/// up–down, as the Tractography page draws them, with the brain's surface
/// faintly around them for bearings. Same frame as the brain window.
@Observable @MainActor
final class TractScene {
    let root = Entity()
    var isLoading = true
    var errorText: String?
    var streamlineCount = 0

    private let scale: Float = 2
    private var k: Float { scale * 0.001 }

    func load() async {
        do {
            let loaded = try await Task.detached(priority: .userInitiated) { () throws -> (TractMeshes, BrainMesh) in
                (try TractMeshes.load(named: "tracts"), try BrainMesh.load(named: "brain"))
            }.value
            for bin in loaded.0.bins {
                var paint = PhysicallyBasedMaterial()
                paint.baseColor = .init(tint: UIColor(red: CGFloat(bin.colour.x) / 255, green: CGFloat(bin.colour.y) / 255, blue: CGFloat(bin.colour.z) / 255, alpha: 1))
                paint.roughness = 0.5
                paint.metallic = 0.0
                let entity = ModelEntity(mesh: try await MeshResource(from: [descriptor(bin.mesh)]), materials: [paint])
                root.addChild(entity)
            }
            var shell = PhysicallyBasedMaterial()
            shell.baseColor = .init(tint: UIColor(white: 0.85, alpha: 1))
            shell.roughness = 0.8
            shell.metallic = 0.0
            shell.blending = .transparent(opacity: 0.12)
            shell.faceCulling = .none
            root.addChild(ModelEntity(mesh: try await MeshResource(from: [descriptor(loaded.1)]), materials: [shell]))
            root.makeGrabbable(scale: k)
            isLoading = false
        } catch {
            errorText = error.localizedDescription
            isLoading = false
        }
    }

    private func descriptor(_ m: BrainMesh) -> MeshDescriptor {
        let centre = AtlasFrame.centreMm
        var d = MeshDescriptor(name: "tracts")
        d.positions = MeshBuffer(m.positions.map { p in
            let q = p - centre
            return SIMD3(-q.x, q.z, q.y) * k
        })
        d.normals = MeshBuffer(m.normals.map { SIMD3(-$0.x, $0.z, $0.y) })
        d.primitives = .triangles(m.indices)
        return d
    }
}

struct TractVolumeView: View {
    @State private var scene = TractScene()

    var body: some View {
        RealityView { content in
            content.add(scene.root)
            await scene.load()
        }
        .turnable(scene.root)
        .overlay {
            if scene.isLoading {
                ProgressView("Loading the tractogram")
                    .padding(24)
                    .glassBackgroundEffect()
            } else if let text = scene.errorText {
                Text(text)
                    .foregroundStyle(.red)
                    .padding(24)
                    .glassBackgroundEffect()
            }
        }
        .ornament(attachmentAnchor: .scene(.bottom)) {
            Text("HCP1065 population tractography · Yeh 2022 · CC BY-SA 4.0")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .glassBackgroundEffect()
        }
    }
}
