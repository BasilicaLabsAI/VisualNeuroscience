import SwiftUI

/// The brain's own console, opened alongside it: the region picker as on the
/// Region Atlas, and six sliders that cut the brain from the outside in, a
/// pair per axis on one line, each pair mirrored so both knobs travel
/// inwards from their own edge.
struct BrainConsoleView: View {
    @Environment(\.openWindow) private var openWindow
    @State private var atlas = Atlas.shared

    private var groups: [String] {
        var seen: [String] = []
        for r in AtlasRegions.all where !seen.contains(r.group) { seen.append(r.group) }
        return seen
    }

    var body: some View {
        @Bindable var atlas = atlas
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                Text("The brain")
                    .font(.system(size: 30, weight: .light, design: .serif))

                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Slice").font(.headline)
                        Spacer()
                        Button("Whole brain") { atlas.resetCuts() }
                            .disabled(!atlas.isCut)
                    }
                    cutRow(axis: 0, from: "Left", to: "Right")
                    cutRow(axis: 1, from: "Back", to: "Front")
                    cutRow(axis: 2, from: "Bottom", to: "Top")
                    Text("Each slider cuts in from its own side; the MRI shows on every cut face.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(20)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))

                VStack(alignment: .leading, spacing: 14) {
                    Text("Highlight regions")
                        .font(.headline)
                    HStack(spacing: 16) {
                        Menu {
                            ForEach(groups, id: \.self) { group in
                                Section(group) {
                                    ForEach(AtlasRegions.all.filter { $0.group == group }, id: \.self) { region in
                                        regionItems(region)
                                    }
                                }
                            }
                        } label: {
                            Label("Add a region", systemImage: "plus.circle")
                        }
                        Toggle("Mirror left / right", isOn: $atlas.mirror)
                            .toggleStyle(.switch)
                            .fixedSize()
                        Spacer()
                        Button("Clear all") { atlas.clear() }
                            .disabled(atlas.selections.isEmpty)
                    }
                    if atlas.selections.isEmpty {
                        Text("Nothing highlighted yet. Pick a region and it lights up on the brain and on every cut face.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    } else {
                        FlowLayout(spacing: 8) {
                            ForEach(atlas.selections) { s in
                                HStack(spacing: 8) {
                                    Circle().fill(Color(UIColor(hex: s.colour))).frame(width: 12, height: 12)
                                    Text(s.name)
                                    if !s.sideTag.isEmpty {
                                        Text(s.sideTag).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Button {
                                        atlas.remove(s.id)
                                    } label: {
                                        Image(systemName: "xmark")
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Remove \(s.name)")
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(.regularMaterial, in: Capsule())
                            }
                        }
                    }
                }
                .padding(20)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))
            }
            .padding(32)
        }
    }

    /// One axis: the lower cut's slider reads left to right from its own
    /// edge, the upper cut's the other way, so both move inwards.
    private func cutRow(axis: Int, from: String, to: String) -> some View {
        HStack(spacing: 12) {
            Text(from)
                .font(.callout)
                .frame(width: 64, alignment: .trailing)
            Slider(value: Binding(get: { atlas.cutLo[axis] }, set: { atlas.setCutLo(axis, $0) }), in: 0...1)
            Slider(value: Binding(get: { atlas.cutHi[axis] }, set: { atlas.setCutHi(axis, $0) }), in: 0...1)
            Text(to)
                .font(.callout)
                .frame(width: 64, alignment: .leading)
        }
    }

    @ViewBuilder
    private func regionItems(_ region: AtlasRegion) -> some View {
        if region.single != nil {
            Button(region.name) { add(region, .single) }
                .disabled(atlas.isSelected(region, side: .single))
        } else if atlas.mirror {
            Button(region.name) { add(region, .pair) }
                .disabled(atlas.isSelected(region, side: .pair))
        } else {
            Button(region.name + " (L)") { add(region, .left) }
                .disabled(atlas.isSelected(region, side: .left))
            Button(region.name + " (R)") { add(region, .right) }
                .disabled(atlas.isSelected(region, side: .right))
        }
    }

    /// Adding a region also opens the window that says what it does.
    private func add(_ region: AtlasRegion, _ side: Atlas.Side) {
        atlas.add(region, side: side)
        openWindow(id: "notes")
    }
}

/// Lays its children out in rows, wrapping like words.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 600
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
