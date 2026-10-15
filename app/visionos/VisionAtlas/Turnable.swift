import SwiftUI
import RealityKit
import Spatial

/// The gestures every object in the room answers to: drag to turn it about
/// any axis, pinch to size it, turn two hands to spin it.
///
/// After Apple's fluid-interface guidance: the object tracks the hand 1:1
/// while it is held; let go of a turn and it carries on at the speed it
/// had, slowing as a scroll does, until the next touch takes over; pinch
/// it past its smallest or largest size and it resists rather than
/// stopping dead, then settles back to the limit when released. With
/// Reduce Motion on, a released object simply stops where it is.
struct Turnable: ViewModifier {
    let root: Entity
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dragging = false
    @State private var dragStart = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var twistStart = simd_quatf(angle: 0, axis: SIMD3(0, 1, 0))
    @State private var pinchStart: Float = 1
    @State private var coasting: Task<Void, Never>?
    @State private var settling: Task<Void, Never>?

    /// Radians of turn per point of hand travel.
    private let gain: Float = 0.008
    private let smallest: Float = 0.5
    private let largest: Float = 2.5

    func body(content: Content) -> some View {
        content
            .simultaneousGesture(
                DragGesture(minimumDistance: 2)
                    .targetedToAnyEntity()
                    .onChanged { value in
                        if !dragging {
                            dragging = true
                            coasting?.cancel()          // the hand takes over from a coasting turn
                            dragStart = root.orientation
                        }
                        let yaw = Float(value.gestureValue.translation.width) * gain
                        let pitch = Float(value.gestureValue.translation.height) * gain
                        root.orientation = simd_quatf(angle: pitch, axis: SIMD3(1, 0, 0))
                            * simd_quatf(angle: yaw, axis: SIMD3(0, 1, 0))
                            * dragStart
                    }
                    .onEnded { value in
                        dragging = false
                        guard !reduceMotion else { return }
                        let v = value.gestureValue.velocity                 // points per second
                        let yawRate = Float(v.width) * gain                 // radians per second
                        let pitchRate = Float(v.height) * gain
                        guard abs(yawRate) + abs(pitchRate) > 0.35 else { return }   // placed, not thrown
                        coasting?.cancel()
                        coasting = Task { await coast(yawRate: yawRate, pitchRate: pitchRate) }
                    }
            )
            .simultaneousGesture(
                MagnifyGesture()
                    .targetedToAnyEntity()
                    .onChanged { value in
                        settling?.cancel()
                        root.scale = SIMD3(repeating: resisted(pinchStart * Float(value.gestureValue.magnification)))
                    }
                    .onEnded { _ in
                        let target = min(largest, max(smallest, root.scale.x))
                        pinchStart = target
                        guard target != root.scale.x else { return }
                        if reduceMotion { root.scale = SIMD3(repeating: target); return }
                        settling?.cancel()
                        settling = Task { await settle(to: target) }
                    }
            )
            .simultaneousGesture(
                RotateGesture3D()
                    .targetedToAnyEntity()
                    .onChanged { value in
                        coasting?.cancel()
                        let q = value.gestureValue.rotation.quaternion.vector
                        let turn = simd_quatf(ix: -Float(q.x), iy: Float(q.y), iz: -Float(q.z), r: Float(q.w))
                        root.orientation = turn * twistStart
                    }
                    .onEnded { _ in twistStart = root.orientation }
            )
            .onDisappear {
                coasting?.cancel()
                settling?.cancel()
            }
    }

    /// Past either limit the object follows the fingers ever less, so a
    /// pinch too far reads as "there is no more" rather than as a wall.
    private func resisted(_ s: Float) -> Float {
        if s < smallest { return smallest - rubberband(smallest - s, dimension: 1) }
        if s > largest { return largest + rubberband(s - largest, dimension: 1) }
        return s
    }

    private func rubberband(_ overshoot: Float, dimension: Float, constant: Float = 0.55) -> Float {
        (overshoot * dimension * constant) / (dimension + constant * abs(overshoot))
    }

    /// Keeps turning at the rate the hand gave it, slowing by 0.998 every
    /// millisecond, the deceleration Apple ships for ordinary scrolling,
    /// until it is all but still or a hand takes hold again.
    private func coast(yawRate: Float, pitchRate: Float) async {
        var yaw = yawRate, pitch = pitchRate
        var last = ContinuousClock.now
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(11))
            if Task.isCancelled { return }
            let now = ContinuousClock.now
            let dt = min(Float(seconds(now - last)), 0.05)
            last = now
            let k = powf(0.998, dt * 1000)
            yaw *= k
            pitch *= k
            root.orientation = simd_quatf(angle: pitch * dt, axis: SIMD3(1, 0, 0))
                * simd_quatf(angle: yaw * dt, axis: SIMD3(0, 1, 0))
                * root.orientation
            if abs(yaw) + abs(pitch) < 0.02 { return }
        }
    }

    /// Eases the size back to its limit after a pinch that pushed past it,
    /// in about a quarter of a second, with no overshoot.
    private func settle(to target: Float) async {
        var last = ContinuousClock.now
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(11))
            if Task.isCancelled { return }
            let now = ContinuousClock.now
            let dt = min(Float(seconds(now - last)), 0.05)
            last = now
            let s = root.scale.x
            let next = s + (target - s) * (1 - expf(-dt / 0.07))
            if abs(target - next) < 0.002 {
                root.scale = SIMD3(repeating: target)
                return
            }
            root.scale = SIMD3(repeating: next)
        }
    }

    private func seconds(_ d: Duration) -> Double {
        let c = d.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
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
