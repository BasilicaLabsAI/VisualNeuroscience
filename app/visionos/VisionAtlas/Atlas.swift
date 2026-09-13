import Foundation
import UIKit

/// What is highlighted, shared between the console that picks regions and
/// the brain window that draws them. Keys, names and side tags follow the
/// Region Atlas page: "P:" for a left-and-right pair, "L:"/"R:" for one
/// side, "S:" for a single midline label.
@Observable @MainActor
final class Atlas {
    static let shared = Atlas()

    struct Selection: Identifiable, Hashable {
        let id: String
        let name: String
        let sideTag: String
        let labels: [Int]
        let colour: String
    }

    enum Side { case pair, left, right, single }

    /// Add left and right together, as the page does by default.
    var mirror = true
    private(set) var selections: [Selection] = []
    /// Bumps on every change, for anyone caching work per selection set.
    private(set) var version = 0

    var labelColours: [Int: String] {
        var out: [Int: String] = [:]
        for s in selections { for l in s.labels { out[l] = s.colour } }
        return out
    }

    func key(for region: AtlasRegion, side: Side) -> String {
        switch side {
        case .pair: return "P:" + region.base
        case .left: return "L:" + region.base
        case .right: return "R:" + region.base
        case .single: return "S:" + region.base
        }
    }

    func isSelected(_ region: AtlasRegion, side: Side) -> Bool {
        selections.contains { $0.id == key(for: region, side: side) }
    }

    func add(_ region: AtlasRegion, side: Side) {
        let id = key(for: region, side: side)
        guard !selections.contains(where: { $0.id == id }) else { return }
        let entry: Selection
        switch side {
        case .pair:
            guard let l = region.left, let r = region.right else { return }
            entry = Selection(id: id, name: region.name, sideTag: "L+R", labels: [l, r], colour: nextColour())
        case .left:
            guard let l = region.left else { return }
            entry = Selection(id: id, name: region.name, sideTag: "L", labels: [l], colour: nextColour())
        case .right:
            guard let r = region.right else { return }
            entry = Selection(id: id, name: region.name, sideTag: "R", labels: [r], colour: nextColour())
        case .single:
            guard let s = region.single else { return }
            entry = Selection(id: id, name: region.name, sideTag: "", labels: [s], colour: nextColour())
        }
        selections.append(entry)
        version += 1
    }

    func remove(_ id: String) {
        selections.removeAll { $0.id == id }
        version += 1
    }

    func clear() {
        guard !selections.isEmpty else { return }
        selections.removeAll()
        version += 1
    }

    /// The first palette colour not in use, then round the palette again.
    private func nextColour() -> String {
        let used = Set(selections.map(\.colour))
        return AtlasRegions.palette.first { !used.contains($0) } ?? AtlasRegions.palette[selections.count % AtlasRegions.palette.count]
    }
}

extension UIColor {
    /// "#RRGGBB" to a colour.
    convenience init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: String(hex.dropFirst())).scanHexInt64(&v)
        self.init(red: CGFloat((v >> 16) & 0xff) / 255, green: CGFloat((v >> 8) & 0xff) / 255, blue: CGFloat(v & 0xff) / 255, alpha: 1)
    }
}

extension SIMD3 where Scalar == UInt8 {
    /// "#RRGGBB" to bytes.
    init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: String(hex.dropFirst())).scanHexInt64(&v)
        self.init(UInt8((v >> 16) & 0xff), UInt8((v >> 8) & 0xff), UInt8(v & 0xff))
    }
}
