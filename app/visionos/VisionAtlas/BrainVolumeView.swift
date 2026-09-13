import SwiftUI
import RealityKit

/// The volumetric window: the brain floats in the room, drag turns it, and
/// the sliders below cut it open along the three MNI axes.
struct BrainVolumeView: View {
    @State private var scene = BrainScene()

    var body: some View {
        RealityView { content in
            content.add(scene.root)
            await scene.load()
        }
        .gesture(
            DragGesture()
                .targetedToEntity(scene.root)
                .onChanged { value in
                    let turn = Float(value.gestureValue.translation.width) * 0.008
                    scene.root.orientation = scene.dragStart * simd_quatf(angle: turn, axis: SIMD3(0, 1, 0))
                }
                .onEnded { _ in scene.dragStart = scene.root.orientation }
        )
        .onChange(of: scene.cut) { _, _ in scene.cutChanged() }
        .overlay {
            if scene.isLoading {
                ProgressView("Loading the brain")
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
            SliceControls(scene: scene)
        }
    }
}

/// Three sliders, one per cut. Each removes the part of the brain beyond
/// the plane and paints the template's slice on the cut face.
struct SliceControls: View {
    @Bindable var scene: BrainScene

    var body: some View {
        VStack(spacing: 10) {
            row("Sagittal", "cuts from the right", $scene.cut.x)
            row("Coronal", "cuts from the front", $scene.cut.y)
            row("Axial", "cuts from the top", $scene.cut.z)
            HStack {
                Button("Whole brain") { scene.cut = SIMD3(1, 1, 1) }
                    .disabled(scene.cut == SIMD3(1, 1, 1))
                Spacer()
                Text("Drag the brain to turn it")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 520)
        .padding(20)
        .glassBackgroundEffect()
    }

    private func row(_ title: String, _ hint: String, _ value: Binding<Float>) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(.headline)
                Text(hint).font(.caption).foregroundStyle(.secondary)
            }
            .frame(width: 150, alignment: .leading)
            Slider(value: value, in: 0.02...1)
            Text(percent(value.wrappedValue))
                .font(.body.monospacedDigit())
                .frame(width: 48, alignment: .trailing)
        }
    }

    private func percent(_ f: Float) -> String {
        f >= 0.999 ? "full" : "\(Int((f * 100).rounded())) %"
    }
}
