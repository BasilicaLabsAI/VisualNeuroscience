import Foundation
import simd

/// Cuts the brain surface back to the part that lies below three
/// axis-aligned planes, one per MNI axis, so the sliders can take the right
/// side, the front and the top off the brain. Triangles wholly inside keep
/// their shared vertices; triangles the planes cross are clipped exactly
/// (Sutherland–Hodgman, one plane after another) and fan-triangulated, with
/// normals interpolated along the cut edges.
enum MeshClipper {
    struct Output {
        var positions: [SIMD3<Float>]
        var normals: [SIMD3<Float>]
        var indices: [UInt32]
    }

    /// `keepBelow` is the millimetre coordinate per axis above which geometry
    /// is removed; an axis at or beyond `limit` is left alone.
    static func clip(_ m: BrainMesh, keepBelow: SIMD3<Float>, limit: SIMD3<Float>) -> Output {
        let planes = (0..<3).filter { keepBelow[$0] < limit[$0] - 0.01 }
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
        polyP.reserveCapacity(8); polyN.reserveCapacity(8); tmpP.reserveCapacity(8); tmpN.reserveCapacity(8)

        let triCount = m.indices.count / 3
        for t in 0..<triCount {
            let i0 = Int(m.indices[3 * t]), i1 = Int(m.indices[3 * t + 1]), i2 = Int(m.indices[3 * t + 2])
            let p0 = m.positions[i0], p1 = m.positions[i1], p2 = m.positions[i2]

            var allIn = true, anyIn = false
            for axis in planes {
                let c = keepBelow[axis]
                let a = p0[axis] <= c, b = p1[axis] <= c, d = p2[axis] <= c
                if !(a && b && d) { allIn = false }
                if a || b || d { anyIn = true }
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
            for axis in planes {
                let c = keepBelow[axis]
                var inside = 0
                for p in polyP where p[axis] <= c { inside += 1 }
                if inside == 0 { keep = false; break }
                if inside == polyP.count { continue }
                tmpP.removeAll(keepingCapacity: true); tmpN.removeAll(keepingCapacity: true)
                let n = polyP.count
                for a in 0..<n {
                    let b = (a + 1) % n
                    let pa = polyP[a], pb = polyP[b]
                    let da = pa[axis] - c, db = pb[axis] - c
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
