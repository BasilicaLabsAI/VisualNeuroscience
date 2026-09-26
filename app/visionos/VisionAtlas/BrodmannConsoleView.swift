import SwiftUI

/// The Brodmann areas as the site lists them: searchable by what they do,
/// grouped by lobe, each one openable to its function and its caveat. With
/// the checkbox on, the picked areas are drawn on the brain as well.
struct BrodmannConsoleView: View {
    @Environment(\.openWindow) private var openWindow
    @State private var atlas = Atlas.shared
    @State private var search = ""
    @State private var open: Int?

    private var matches: [BrodmannArea] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return Brodmann.areas }
        return Brodmann.areas.filter { a in
            "ba\(a.ba)".hasPrefix(q) || String(a.ba) == q
                || a.name.lowercased().contains(q) || a.region.lowercased().contains(q)
                || a.tags.lowercased().contains(q) || a.function.lowercased().contains(q)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Brodmann areas")
                    .font(.system(size: 30, weight: .light, design: .serif))

                HStack(spacing: 16) {
                    TextField("Search by function, name or number", text: $search)
                        .textFieldStyle(.roundedBorder)
                    Toggle(isOn: Binding(get: { atlas.showBrodmann }, set: { on in
                        atlas.setShowBrodmann(on)
                        if on {
                            if !atlas.isOpen("brain") { openWindow(id: "brain") }
                            if !atlas.isOpen("notes") { openWindow(id: "notes") }
                        }
                    })) {
                        Text("Show on the brain")
                    }
                    .toggleStyle(.switch)
                    .fixedSize()
                    Button("Clear") { atlas.clearPicks() }
                        .disabled(atlas.brodmann.isEmpty)
                }

                if let ba = open, let area = Brodmann.areas.first(where: { $0.ba == ba }) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 10) {
                            if let pick = atlas.brodmann.first(where: { $0.id == ba }) {
                                Circle().fill(Color(UIColor(hex: pick.colour))).frame(width: 12, height: 12)
                            }
                            Text("Area \(area.ba) · \(area.name)").font(.headline)
                            Spacer()
                            Text(area.region).font(.caption).foregroundStyle(.secondary)
                        }
                        Text(area.function)
                        if !area.note.isEmpty {
                            Text(area.note).font(.callout).foregroundStyle(.secondary)
                        }
                    }
                    .padding(20)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))
                }

                ForEach(Brodmann.lobes, id: \.self) { lobe in
                    let areas = matches.filter { $0.lobe == lobe.id }
                    if !areas.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(lobe.label).font(.headline)
                                Text(lobe.sub).font(.caption).foregroundStyle(.secondary)
                            }
                            ForEach(areas, id: \.self) { area in
                                HStack(spacing: 12) {
                                    Button {
                                        atlas.togglePick(area.ba)
                                        open = area.ba
                                    } label: {
                                        Image(systemName: atlas.isPicked(area.ba) ? "checkmark.circle.fill" : "circle")
                                            .foregroundStyle(atlas.brodmann.first { $0.id == area.ba }.map { Color(UIColor(hex: $0.colour)) } ?? .secondary)
                                    }
                                    .buttonStyle(.plain)
                                    Button {
                                        open = area.ba
                                    } label: {
                                        HStack {
                                            Text("BA \(area.ba)").font(.body.monospacedDigit()).frame(width: 56, alignment: .leading)
                                            Text(area.name)
                                            Spacer()
                                            Text(area.region).font(.caption).foregroundStyle(.secondary)
                                        }
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                        .padding(20)
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))
                    }
                }
            }
            .padding(32)
        }
    }
}
