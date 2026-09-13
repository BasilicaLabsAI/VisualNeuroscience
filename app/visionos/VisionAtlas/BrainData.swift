import Foundation
import Compression
import simd

// The two data files the brain window draws from, both made from the site's
// own MNI152 template by app/scripts/make-vision-assets.js:
//
//   brain.mesh.gz the outer surface of the brain, as the Region Atlas exports
//                 it, gzipped: 'VNM2', vertex count, index count, then xyz
//                 positions as int16 hundredths of a millimetre, normals as
//                 int8, and uint32 triangle indices, little-endian, MNI frame.
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
        guard let url = Bundle.main.url(forResource: name, withExtension: "mesh.gz") else { throw BrainDataError.missing("\(name).mesh.gz") }
        let b = try Gzip.inflate(try Data(contentsOf: url), name: "\(name).mesh.gz")
        guard b.count >= 12, b.tag(at: 0) == "VNM2" else { throw BrainDataError.corrupt("\(name).mesh.gz") }
        let v = Int(b.u32(at: 4)), n = Int(b.u32(at: 8))
        guard v > 0, n > 0, n % 3 == 0, b.count == 12 + v * 9 + n * 4 else { throw BrainDataError.corrupt("\(name).mesh.gz") }

        var positions = [SIMD3<Float>](); positions.reserveCapacity(v)
        var normals = [SIMD3<Float>](); normals.reserveCapacity(v)
        let indices: [UInt32] = b.withUnsafeBytes { raw in
            var o = 12
            for _ in 0..<v {
                let x = raw.loadUnaligned(fromByteOffset: o, as: Int16.self)
                let y = raw.loadUnaligned(fromByteOffset: o + 2, as: Int16.self)
                let z = raw.loadUnaligned(fromByteOffset: o + 4, as: Int16.self)
                positions.append(SIMD3(Float(x), Float(y), Float(z)) * 0.01)
                o += 6
            }
            for _ in 0..<v {
                let x = raw.load(fromByteOffset: o, as: Int8.self)
                let y = raw.load(fromByteOffset: o + 1, as: Int8.self)
                let z = raw.load(fromByteOffset: o + 2, as: Int8.self)
                let raw3 = SIMD3(Float(x), Float(y), Float(z))
                normals.append(simd_length(raw3) > 0 ? simd_normalize(raw3) : SIMD3(0, 0, 1))
                o += 3
            }
            return [UInt32](unsafeUninitializedCapacity: n) { buf, filled in
                UnsafeMutableRawBufferPointer(buf).copyMemory(from: UnsafeRawBufferPointer(rebasing: raw[o..<o + n * 4]))
                filled = n
            }
        }
        guard indices.allSatisfy({ Int($0) < v }) else { throw BrainDataError.corrupt("\(name).mesh.gz") }
        return BrainMesh(positions: positions, normals: normals, indices: indices)
    }
}

/// A surface for every AAL label, decoded one label at a time as they are
/// asked for. Same packing as the brain, under a small table of contents.
final class RegionMeshes: @unchecked Sendable {
    private let bytes: [UInt8]
    private let offsets: [Int: (offset: Int, verts: Int, indices: Int)]

    init(named name: String) throws {
        guard let url = Bundle.main.url(forResource: name, withExtension: "mesh.gz") else { throw BrainDataError.missing("\(name).mesh.gz") }
        let b = try Gzip.inflate(try Data(contentsOf: url), name: "\(name).mesh.gz")
        guard b.count >= 8, String(decoding: b[0..<4], as: UTF8.self) == "VNR1" else { throw BrainDataError.corrupt("\(name).mesh.gz") }
        let count = Int(UInt32(b[4]) | UInt32(b[5]) << 8 | UInt32(b[6]) << 16 | UInt32(b[7]) << 24)
        var table: [Int: (Int, Int, Int)] = [:]
        var o = 8
        for _ in 0..<count {
            guard o + 10 <= b.count else { throw BrainDataError.corrupt("\(name).mesh.gz") }
            let label = Int(UInt16(b[o]) | UInt16(b[o + 1]) << 8)
            let v = Int(UInt32(b[o + 2]) | UInt32(b[o + 3]) << 8 | UInt32(b[o + 4]) << 16 | UInt32(b[o + 5]) << 24)
            let n = Int(UInt32(b[o + 6]) | UInt32(b[o + 7]) << 8 | UInt32(b[o + 8]) << 16 | UInt32(b[o + 9]) << 24)
            o += 10
            guard o + v * 9 + n * 4 <= b.count else { throw BrainDataError.corrupt("\(name).mesh.gz") }
            table[label] = (o, v, n)
            o += v * 9 + n * 4
        }
        bytes = b
        offsets = table
    }

    func mesh(for label: Int) -> BrainMesh? {
        guard let entry = offsets[label] else { return nil }
        return BrainMesh.unpack(bytes, at: entry.offset, verts: entry.verts, indices: entry.indices)
    }
}

extension Volume {
    /// The byte at the voxel nearest a millimetre position, 0 outside.
    func value(atMm p: SIMD3<Float>) -> UInt8 {
        let i = Int(((p.x - origin.x) / spacing).rounded())
        let j = Int(((p.y - origin.y) / spacing).rounded())
        let k = Int(((p.z - origin.z) / spacing).rounded())
        guard i >= 0, j >= 0, k >= 0, i < dims.x, j < dims.y, k < dims.z else { return 0 }
        return data[(k * dims.y + j) * dims.x + i]
    }
}

/// The tractogram as tubes, one mesh per direction colour.
struct TractMeshes {
    struct Bin {
        let colour: SIMD3<UInt8>
        let mesh: BrainMesh
    }
    let bins: [Bin]

    static func load(named name: String) throws -> TractMeshes {
        guard let url = Bundle.main.url(forResource: name, withExtension: "mesh.gz") else { throw BrainDataError.missing("\(name).mesh.gz") }
        let b = try Gzip.inflate(try Data(contentsOf: url), name: "\(name).mesh.gz")
        guard b.count >= 8, String(decoding: b[0..<4], as: UTF8.self) == "VNT1" else { throw BrainDataError.corrupt("\(name).mesh.gz") }
        let count = Int(UInt32(b[4]) | UInt32(b[5]) << 8 | UInt32(b[6]) << 16 | UInt32(b[7]) << 24)
        var bins: [Bin] = []
        var o = 8
        for _ in 0..<count {
            guard o + 11 <= b.count else { throw BrainDataError.corrupt("\(name).mesh.gz") }
            let colour = SIMD3<UInt8>(b[o], b[o + 1], b[o + 2])
            let v = Int(UInt32(b[o + 3]) | UInt32(b[o + 4]) << 8 | UInt32(b[o + 5]) << 16 | UInt32(b[o + 6]) << 24)
            let n = Int(UInt32(b[o + 7]) | UInt32(b[o + 8]) << 8 | UInt32(b[o + 9]) << 16 | UInt32(b[o + 10]) << 24)
            o += 11
            guard o + v * 9 + n * 4 <= b.count, let mesh = BrainMesh.unpack(b, at: o, verts: v, indices: n) else { throw BrainDataError.corrupt("\(name).mesh.gz") }
            bins.append(Bin(colour: colour, mesh: mesh))
            o += v * 9 + n * 4
        }
        return TractMeshes(bins: bins)
    }
}

extension BrainMesh {
    /// Decodes the packed form: int16 hundredths of a millimetre, int8 normals, uint32 indices.
    static func unpack(_ bytes: [UInt8], at offset: Int, verts v: Int, indices n: Int) -> BrainMesh? {
        var positions = [SIMD3<Float>](); positions.reserveCapacity(v)
        var normals = [SIMD3<Float>](); normals.reserveCapacity(v)
        let indices: [UInt32] = bytes.withUnsafeBytes { raw in
            var o = offset
            for _ in 0..<v {
                let x = raw.loadUnaligned(fromByteOffset: o, as: Int16.self)
                let y = raw.loadUnaligned(fromByteOffset: o + 2, as: Int16.self)
                let z = raw.loadUnaligned(fromByteOffset: o + 4, as: Int16.self)
                positions.append(SIMD3(Float(x), Float(y), Float(z)) * 0.01)
                o += 6
            }
            for _ in 0..<v {
                let raw3 = SIMD3(Float(raw.load(fromByteOffset: o, as: Int8.self)), Float(raw.load(fromByteOffset: o + 1, as: Int8.self)), Float(raw.load(fromByteOffset: o + 2, as: Int8.self)))
                normals.append(simd_length(raw3) > 0 ? simd_normalize(raw3) : SIMD3(0, 0, 1))
                o += 3
            }
            return [UInt32](unsafeUninitializedCapacity: n) { buf, filled in
                UnsafeMutableRawBufferPointer(buf).copyMemory(from: UnsafeRawBufferPointer(rebasing: raw[o..<o + n * 4]))
                filled = n
            }
        }
        guard indices.allSatisfy({ Int($0) < v }) else { return nil }
        return BrainMesh(positions: positions, normals: normals, indices: indices)
    }
}
