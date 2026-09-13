import SwiftUI
import RealityKit
import Spatial

/// The gestures every object in the room answers to: drag to turn it about
/// any axis, pinch to size it, turn two hands to spin it.
struct Turnable: ViewModifier {
    let root: Entity
    @State private var dragging = false
    @State private var dragStart = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var twistStart = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var pinchStart: Float = 1

    func body(content: Content) -> some View {
        content
            .simultaneousGesture(
                DragGesture(minimumDistance: 2)
                    .targetedToAnyEntity()
                    .onChanged { value in
                        if !dragging {
                            dragging = true
                            dragStart = root.orientation
                        }
                        let yaw = Float(value.gestureValue.translation.width) * 0.008
                        let pitch = Float(value.gestureValue.translation.height) * 0.008
                        root.orientation = simd_quatf(angle: pitch, axis: SIMD3(1, 0, 0))
                            * simd_quatf(angle: yaw, axis: SIMD3(0, 1, 0))
                            * dragStart
                    }
                    .onEnded { _ in dragging = false }
            )
            .simultaneousGesture(
                MagnifyGesture()
                    .targetedToAnyEntity()
                    .onChanged { value in
                        let s = max(0.5, min(2.5, pinchStart * Float(value.gestureValue.magnification)))
                        root.scale = SIMD3(repeating: s)
                    }
                    .onEnded { _ in pinchStart = root.scale.x }
            )
            .simultaneousGesture(
                RotateGesture3D()
                    .targetedToAnyEntity()
                    .onChanged { value in
                        let q = value.gestureValue.rotation.quaternion.vector
                        let turn = simd_quatf(ix: -Float(q.x), iy: Float(q.y), iz: -Float(q.z), r: Float(q.w))
                        root.orientation = turn * twistStart
                    }
                    .onEnded { _ in twistStart = root.orientation }
            )
    }
}

extension View {
    func turnable(_ root: Entity) -> some View { modifier(Turnable(root: root)) }
}

/// A box the size of the template so the gestures have something to hit.
extension Entity {
    func makeGrabbable(scale k: Float) {
        let extent = (AtlasFrame.maxMm - AtlasFrame.minMm) * k
        components.set(CollisionComponent(shapes: [.generateBox(size: SIMD3(extent.x, extent.z, extent.y))]))
        components.set(InputTargetComponent())
    }
}
