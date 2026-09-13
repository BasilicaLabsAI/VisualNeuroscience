import Foundation
import simd

/// Cuts a surface mesh back to the part between six axis-aligned planes,
/// a lower and an upper one per MNI axis, so the sliders can take the
/// brain apart from the outside in. Triangles wholly inside keep their
/// shared vertices; triangles a plane crosses are clipped exactly
/// (Sutherland–Hodgman, one plane after another) and fan-triangulated, with
/// normals interpolated along the cut edges.
enum MeshClipper {
    struct Output {
        var positions: [SIMD3<Float>]
        var normals: [SIMD3<Float>]
        var indices: [UInt32]
    }

    private struct Plane {
        let axis: Int
        let at: Float
        let keepBelow: Bool
        /// Signed distance: negative or zero is kept.
        func d(_ p: SIMD3<Float>) -> Float { keepBelow ? p[axis] - at : at - p[axis] }
    }

    /// Keeps `lo[axis] <= p <= hi[axis]` on each axis. A bound at or beyond
    /// the volume's own limit is left alone.
    static func clip(_ m: BrainMesh, lo: SIMD3<Float>, hi: SIMD3<Float>, limitLo: SIMD3<Float>, limitHi: SIMD3<Float>) -> Output {
        var planes: [Plane] = []
        for axis in 0..<3 {
            if lo[axis] > limitLo[axis] + 0.01 { planes.append(Plane(axis: axis, at: lo[axis], keepBelow: false)) }
            if hi[axis] < limitHi[axis] - 0.01 { planes.append(Plane(axis: axis, at: hi[axis], keepBelow: true)) }
        }
        if planes.isEmpty { return Output(positions: m.positions, normals: m.normals, indices: m.indices) }

        var out = Output(positions: [], normals: [], indices: [])
        out.positions.reserveCapacity(m.positions.count)
        out.normals.reserveCapacity(m.normals.count)
        out.indices.reserveCapacity(m.indices.count)
        var remap = [Int32](repeating: -1, count: m.positions.count)

        func shared(_ i: Int) -> UInt32 {
            if remap[i] < 0 {
                remap[i] = Int32(out.positions.count)
                out.positions.append(m.positions[i])
                out.normals.append(m.normals[i])
            }
            return UInt32(remap[i])
        }

        var polyP = [SIMD3<Float>](), polyN = [SIMD3<Float>]()
        var tmpP = [SIMD3<Float>](), tmpN = [SIMD3<Float>]()
        polyP.reserveCapacity(10); polyN.reserveCapacity(10); tmpP.reserveCapacity(10); tmpN.reserveCapacity(10)

        let triCount = m.indices.count / 3
        for t in 0..<triCount {
            let i0 = Int(m.indices[3 * t]), i1 = Int(m.indices[3 * t + 1]), i2 = Int(m.indices[3 * t + 2])
            let p0 = m.positions[i0], p1 = m.positions[i1], p2 = m.positions[i2]

            var allIn = true, anyIn = false
            for pl in planes {
                let a = pl.d(p0) <= 0, b = pl.d(p1) <= 0, c = pl.d(p2) <= 0
                if !(a && b && c) { allIn = false }
                if a || b || c { anyIn = true }
            }
            if allIn {
                out.indices.append(shared(i0)); out.indices.append(shared(i1)); out.indices.append(shared(i2))
                continue
            }
            if !anyIn { continue }

            polyP.removeAll(keepingCapacity: true); polyN.removeAll(keepingCapacity: true)
            polyP.append(p0); polyP.append(p1); polyP.append(p2)
            polyN.append(m.normals[i0]); polyN.append(m.normals[i1]); polyN.append(m.normals[i2])

            var keep = true
            for pl in planes {
                var inside = 0
                for p in polyP where pl.d(p) <= 0 { inside += 1 }
                if inside == 0 { keep = false; break }
                if inside == polyP.count { continue }
                tmpP.removeAll(keepingCapacity: true); tmpN.removeAll(keepingCapacity: true)
                let n = polyP.count
                for a in 0..<n {
                    let b = (a + 1) % n
                    let pa = polyP[a], pb = polyP[b]
                    let da = pl.d(pa), db = pl.d(pb)
                    let aIn = da <= 0, bIn = db <= 0
                    if aIn { tmpP.append(pa); tmpN.append(polyN[a]) }
                    if aIn != bIn {
                        let s = da / (da - db)
                        tmpP.append(pa + (pb - pa) * s)
                        tmpN.append(simd_normalize(polyN[a] + (polyN[b] - polyN[a]) * s))
                    }
                }
                swap(&polyP, &tmpP); swap(&polyN, &tmpN)
                if polyP.count < 3 { keep = false; break }
            }
            if !keep { continue }

            let base = UInt32(out.positions.count)
            out.positions.append(contentsOf: polyP)
            out.normals.append(contentsOf: polyN)
            for k in 1..<(polyP.count - 1) {
                out.indices.append(base); out.indices.append(base + UInt32(k)); out.indices.append(base + UInt32(k + 1))
            }
        }
        return out
    }
}
