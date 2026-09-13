import SwiftUI
import RealityKit
import Spatial

/// The volumetric window. Drag the brain to turn it any way you like,
/// pinch to size it, turn two hands to spin it. The cuts and the
/// highlighted regions come from the brain console, which opens with it.
struct BrainVolumeView: View {
    @Environment(\.openWindow) private var openWindow
    @State private var scene = BrainScene()
    @State private var dragging = false
    @State private var dragStartOrientation = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var twistStartOrientation = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var pinchStart: Float = 1

    var body: some View {
        RealityView { content in
            content.add(scene.root)
            await scene.load()
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 2)
                .targetedToAnyEntity()
                .onChanged { value in
                    if !dragging {
                        dragging = true
                        dragStartOrientation = scene.root.orientation
                    }
                    let yaw = Float(value.gestureValue.translation.width) * 0.008
                    let pitch = Float(value.gestureValue.translation.height) * 0.008
                    scene.root.orientation = simd_quatf(angle: pitch, axis: SIMD3(1, 0, 0))
                        * simd_quatf(angle: yaw, axis: SIMD3(0, 1, 0))
                        * dragStartOrientation
                }
                .onEnded { _ in dragging = false }
        )
        .simultaneousGesture(
            MagnifyGesture()
                .targetedToAnyEntity()
                .onChanged { value in
                    let s = max(0.5, min(2.5, pinchStart * Float(value.gestureValue.magnification)))
                    scene.root.scale = SIMD3(repeating: s)
                }
                .onEnded { _ in pinchStart = scene.root.scale.x }
        )
        .simultaneousGesture(
            RotateGesture3D()
                .targetedToAnyEntity()
                .onChanged { value in
                    let q = value.gestureValue.rotation3D.quaternion.vector
                    let turn = simd_quatf(ix: -Float(q.x), iy: Float(q.y), iz: -Float(q.z), r: Float(q.w))
                    scene.root.orientation = turn * twistStartOrientation
                }
                .onEnded { _ in twistStartOrientation = scene.root.orientation }
        )
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
