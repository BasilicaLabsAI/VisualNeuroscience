import Foundation
import UIKit

/// What is highlighted and how the brain is cut, shared between the consoles
/// that choose and the windows that draw. Keys, names and side tags follow
/// the Region Atlas page: "P:" for a left-and-right pair, "L:"/"R:" for one
/// side, "S:" for a single midline label.
@Observable @MainActor
final class Atlas {
    static let shared = Atlas()

    struct Selection: Identifiable, Hashable {
        let id: String
        let base: String
        let name: String
        let sideTag: String
        let labels: [Int]
        let colour: String
    }

    struct BrodmannPick: Identifiable, Hashable {
        let id: Int
        let colour: String
        var area: BrodmannArea? { Brodmann.areas.first { $0.ba == id } }
    }

    enum Side { case pair, left, right, single }

    /// Add left and right together, as the page does by default.
    var mirror = true
    private(set) var selections: [Selection] = []
    private(set) var brodmann: [BrodmannPick] = []
    /// The Brodmann console's checkbox: draw its picks on the brain too.
    private(set) var showBrodmann = false
    /// Bumps on every change to what is highlighted, for anyone caching work per set.
    private(set) var version = 0

    /// The cuts, as fractions of each MNI axis: `cutLo` is where the kept
    /// part starts (0 = nothing cut from the left, back or bottom) and
    /// `cutHi` where it ends (1 = nothing cut from the right, front or top).
    var cutLo = SIMD3<Float>(0, 0, 0)
    var cutHi = SIMD3<Float>(1, 1, 1)
    var isCut: Bool { cutLo != SIMD3(0, 0, 0) || cutHi != SIMD3(1, 1, 1) }

    /// Keeps at least a sliver between the two cuts of an axis.
    func setCutLo(_ axis: Int, _ f: Float) { cutLo[axis] = min(max(0, f), cutHi[axis] - 0.04) }
    func setCutHi(_ axis: Int, _ f: Float) { cutHi[axis] = max(min(1, f), cutLo[axis] + 0.04) }
    func resetCuts() { cutLo = SIMD3(0, 0, 0); cutHi = SIMD3(1, 1, 1) }

    /// AAL label to colour, for everything highlighted.
    var labelColours: [Int: String] {
        var out: [Int: String] = [:]
        for s in selections { for l in s.labels { out[l] = s.colour } }
        return out
    }

    /// Brodmann area to colour, when the checkbox has them on the brain.
    var brodmannColours: [Int: String] {
        guard showBrodmann else { return [:] }
        var out: [Int: String] = [:]
        for p in brodmann { out[p.id] = p.colour }
        return out
    }

    var anythingHighlighted: Bool { !selections.isEmpty || !brodmannColours.isEmpty }

    // MARK: AAL regions

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
            entry = Selection(id: id, base: region.base, name: region.name, sideTag: "L+R", labels: [l, r], colour: nextColour())
        case .left:
            guard let l = region.left else { return }
            entry = Selection(id: id, base: region.base, name: region.name, sideTag: "L", labels: [l], colour: nextColour())
        case .right:
            guard let r = region.right else { return }
            entry = Selection(id: id, base: region.base, name: region.name, sideTag: "R", labels: [r], colour: nextColour())
        case .single:
            guard let s = region.single else { return }
            entry = Selection(id: id, base: region.base, name: region.name, sideTag: "", labels: [s], colour: nextColour())
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

    // MARK: Brodmann areas

    func isPicked(_ ba: Int) -> Bool { brodmann.contains { $0.id == ba } }

    func togglePick(_ ba: Int) {
        if let i = brodmann.firstIndex(where: { $0.id == ba }) { brodmann.remove(at: i) }
        else { brodmann.append(BrodmannPick(id: ba, colour: nextColour())) }
        if showBrodmann { version += 1 }
    }

    func clearPicks() {
        guard !brodmann.isEmpty else { return }
        brodmann.removeAll()
        if showBrodmann { version += 1 }
    }

    func setShowBrodmann(_ on: Bool) {
        guard on != showBrodmann else { return }
        showBrodmann = on
        version += 1
    }

    /// The first palette colour not in use, then round the palette again.
    private func nextColour() -> String {
        let used = Set(selections.map(\.colour) + brodmann.map(\.colour))
        return AtlasRegions.palette.first { !used.contains($0) } ?? AtlasRegions.palette[used.count % AtlasRegions.palette.count]
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
