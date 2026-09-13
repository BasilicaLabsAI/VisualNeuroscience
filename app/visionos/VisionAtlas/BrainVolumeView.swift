import SwiftUI
import RealityKit

/// The volumetric window. Drag the brain to turn it any way you like,
/// pinch to size it, turn two hands to spin it. The cuts and the
/// highlighted regions come from the brain console, which opens with it.
struct BrainVolumeView: View {
    @Environment(\.openWindow) private var openWindow
    @State private var scene = BrainScene()

    var body: some View {
        RealityView { content in
            content.add(scene.root)
            await scene.load()
        }
        .turnable(scene.root)
        .onAppear { openWindow(id: "brain-console") }
        .onChange(of: Atlas.shared.version) { _, _ in scene.selectionsChanged() }
        .onChange(of: Atlas.shared.cutLo) { _, _ in scene.cutsChanged() }
        .onChange(of: Atlas.shared.cutHi) { _, _ in scene.cutsChanged() }
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
    }
}
