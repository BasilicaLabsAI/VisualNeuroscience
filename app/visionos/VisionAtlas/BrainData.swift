import Foundation
import Compression
import simd

// The two data files the brain window draws from, both made from the site's
// own MNI152 template by app/scripts/make-vision-assets.js:
//
//   brain.mesh    the outer surface of the brain, as the Region Atlas exports
//                 it: 'VNM1', vertex count, index count, then float32 xyz
//                 positions, float32 normals and uint32 triangle indices,
//                 little-endian, in MNI millimetres.
//   brain.vol.gz  the template's voxels, gzipped: 'VNV1', three uint32
//                 dimensions, float32 spacing, float32 origin xyz, then one
//                 byte per voxel with x fastest. Everything outside the brain
//                 is 0; inside, the T1 intensity clamped to at least 1, so a
//                 zero byte always means "not brain".

enum BrainDataError: LocalizedError {
    case missing(String)
    case corrupt(String)

    var errorDescription: String? {
        switch self {
        case .missing(let name): return "\(name) is not in the app bundle."
        case .corrupt(let name): return "\(name) could not be read."
        }
    }
}

enum Gzip {
    /// Inflates a single-member gzip stream. Apple's Compression framework
    /// speaks raw DEFLATE under the name COMPRESSION_ZLIB, so the gzip header
    /// and the eight-byte trailer are stepped over by hand.
    static func inflate(_ gz: Data, name: String) throws -> [UInt8] {
        let b = [UInt8](gz)
        let n = b.count
        guard n > 18, b[0] == 0x1f, b[1] == 0x8b, b[2] == 8 else { throw BrainDataError.corrupt(name) }
        let flags = b[3]
        var p = 10
        if flags & 0x04 != 0 { p += 2 + (Int(b[p]) | Int(b[p + 1]) << 8) }
        if flags & 0x08 != 0 { while p < n, b[p] != 0 { p += 1 }; p += 1 }
        if flags & 0x10 != 0 { while p < n, b[p] != 0 { p += 1 }; p += 1 }
        if flags & 0x02 != 0 { p += 2 }
        let size = Int(b[n - 4]) | Int(b[n - 3]) << 8 | Int(b[n - 2]) << 16 | Int(b[n - 1]) << 24
        guard size > 0, p < n - 8 else { throw BrainDataError.corrupt(name) }
        var out = [UInt8](repeating: 0, count: size)
        let written = out.withUnsafeMutableBufferPointer { dst in
            b.withUnsafeBufferPointer { src in
                compression_decode_buffer(dst.baseAddress!, size, src.baseAddress! + p, n - 8 - p, nil, COMPRESSION_ZLIB)
            }
        }
        guard written == size else { throw BrainDataError.corrupt(name) }
        return out
    }
}

private extension Array where Element == UInt8 {
    func u32(at o: Int) -> UInt32 {
        UInt32(self[o]) | UInt32(self[o + 1]) << 8 | UInt32(self[o + 2]) << 16 | UInt32(self[o + 3]) << 24
    }
    func f32(at o: Int) -> Float { Float(bitPattern: u32(at: o)) }
    func tag(at o: Int) -> String { String(decoding: self[o..<o + 4], as: UTF8.self) }
}

/// The template's voxels and the millimetre frame they sit in.
struct Volume {
    let dims: SIMD3<Int>
    let spacing: Float
    let origin: SIMD3<Float>
    let data: [UInt8]

    var minMm: SIMD3<Float> { origin }
    var maxMm: SIMD3<Float> { origin + SIMD3<Float>(Float(dims.x - 1), Float(dims.y - 1), Float(dims.z - 1)) * spacing }

    /// The voxel index along an axis for a millimetre coordinate, clamped.
    func index(axis: Int, mm: Float) -> Int {
        let i = Int(((mm - origin[axis]) / spacing).rounded())
        return max(0, min(dims[axis] - 1, i))
    }

    static func load(named name: String) throws -> Volume {
        guard let url = Bundle.main.url(forResource: name, withExtension: "vol.gz") else { throw BrainDataError.missing("\(name).vol.gz") }
        let bytes = try Gzip.inflate(try Data(contentsOf: url), name: "\(name).vol.gz")
        guard bytes.count > 32, bytes.tag(at: 0) == "VNV1" else { throw BrainDataError.corrupt("\(name).vol.gz") }
        let dims = SIMD3<Int>(Int(bytes.u32(at: 4)), Int(bytes.u32(at: 8)), Int(bytes.u32(at: 12)))
        let spacing = bytes.f32(at: 16)
        let origin = SIMD3<Float>(bytes.f32(at: 20), bytes.f32(at: 24), bytes.f32(at: 28))
        guard bytes.count == 32 + dims.x * dims.y * dims.z, spacing > 0 else { throw BrainDataError.corrupt("\(name).vol.gz") }
        return Volume(dims: dims, spacing: spacing, origin: origin, data: Array(bytes[32...]))
    }
}

/// The brain's outer surface in MNI millimetres.
struct BrainMesh {
    var positions: [SIMD3<Float>]
    var normals: [SIMD3<Float>]
    var indices: [UInt32]

    static func load(named name: String) throws -> BrainMesh {
        guard let url = Bundle.main.url(forResource: name, withExtension: "mesh") else { throw BrainDataError.missing("\(name).mesh") }
        let data = try Data(contentsOf: url)
        return try data.withUnsafeBytes { raw -> BrainMesh in
            guard raw.count >= 12 else { throw BrainDataError.corrupt("\(name).mesh") }
            let magic = String(decoding: raw[0..<4], as: UTF8.self)
            let v = Int(raw.loadUnaligned(fromByteOffset: 4, as: UInt32.self))
            let n = Int(raw.loadUnaligned(fromByteOffset: 8, as: UInt32.self))
            guard magic == "VNM1", v > 0, n > 0, n % 3 == 0, raw.count == 12 + v * 24 + n * 4 else { throw BrainDataError.corrupt("\(name).mesh") }

            func floats(from offset: Int, count: Int) -> [Float] {
                [Float](unsafeUninitializedCapacity: count) { buf, filled in
                    UnsafeMutableRawBufferPointer(buf).copyMemory(from: UnsafeRawBufferPointer(rebasing: raw[offset..<offset + count * 4]))
                    filled = count
                }
            }
            func vectors(_ f: [Float]) -> [SIMD3<Float>] {
                var out = [SIMD3<Float>](); out.reserveCapacity(f.count / 3)
                var i = 0
                while i < f.count { out.append(SIMD3(f[i], f[i + 1], f[i + 2])); i += 3 }
                return out
            }
            let positions = vectors(floats(from: 12, count: v * 3))
            let normals = vectors(floats(from: 12 + v * 12, count: v * 3))
            let indices = [UInt32](unsafeUninitializedCapacity: n) { buf, filled in
                UnsafeMutableRawBufferPointer(buf).copyMemory(from: UnsafeRawBufferPointer(rebasing: raw[(12 + v * 24)..<(12 + v * 24 + n * 4)]))
                filled = n
            }
            guard indices.allSatisfy({ Int($0) < v }) else { throw BrainDataError.corrupt("\(name).mesh") }
            return BrainMesh(positions: positions, normals: normals, indices: indices)
        }
    }
}
