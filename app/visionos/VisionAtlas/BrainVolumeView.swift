import SwiftUI
import RealityKit

/// The volumetric window. Drag the brain to turn it any way you like, pinch
/// to size it, and with the panes on, drag a pane by the part that sticks
/// out to slide the cut through the brain.
struct BrainVolumeView: View {
    @State private var scene = BrainScene()
    @State private var dragging = false
    @State private var dragPane: Int?
    @State private var dragStartCut: Float = 1
    @State private var dragStartOrientation = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var pinchStart: Float = 1

    var body: some View {
        RealityView { content in
            content.add(scene.root)
            await scene.load()
        }
        .gesture(
            DragGesture(minimumDistance: 2)
                .targetedToAnyEntity()
                .onChanged { value in
                    if !dragging {
                        dragging = true
                        dragPane = scene.paneAxis(of: value.entity)
                        if let axis = dragPane { dragStartCut = scene.cut[axis] }
                        dragStartOrientation = scene.root.orientation
                    }
                    if let axis = dragPane {
                        let movement = value.convert(value.translation3D, from: .local, to: .scene)
                        scene.slide(axis: axis, from: dragStartCut, by: movement)
                    } else {
                        let yaw = Float(value.gestureValue.translation.width) * 0.008
                        let pitch = Float(value.gestureValue.translation.height) * 0.008
                        scene.root.orientation = simd_quatf(angle: pitch, axis: SIMD3(1, 0, 0))
                            * simd_quatf(angle: yaw, axis: SIMD3(0, 1, 0))
                            * dragStartOrientation
                    }
                }
                .onEnded { _ in
                    dragging = false
                    dragPane = nil
                }
        )
        .simultaneousGesture(
            MagnifyGesture()
                .targetedToAnyEntity()
                .onChanged { value in
                    let s = max(0.5, min(2.2, pinchStart * Float(value.gestureValue.magnification)))
                    scene.root.scale = SIMD3(repeating: s)
                }
                .onEnded { _ in pinchStart = scene.root.scale.x }
        )
        .onChange(of: scene.panesOn) { _, _ in scene.panesChanged() }
        .onChange(of: Atlas.shared.version) { _, _ in scene.selectionsChanged() }
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
            HStack(spacing: 16) {
                Toggle(isOn: $scene.panesOn) {
                    Label("Slice panes", systemImage: "square.stack.3d.up")
                }
                .toggleStyle(.button)
                Button {
                    scene.showWholeBrain()
                } label: {
                    Label("Whole brain", systemImage: "arrow.counterclockwise")
                }
                .disabled(scene.cut == SIMD3(1, 1, 1))
            }
            .padding(14)
            .glassBackgroundEffect()
        }
    }
}
