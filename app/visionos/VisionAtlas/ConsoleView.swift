import SwiftUI

/// The window the app opens with: what it can put in the room, and the
/// region picker that highlights parts of the brain, as on the Region Atlas.
struct ConsoleView: View {
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
            VStack(spacing: 28) {
                VStack(spacing: 6) {
                    Text("VisualNeuroscience.AI")
                        .font(.system(size: 40, weight: .light, design: .serif))
                    Text("Console")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 20) {
                    ConsoleButton(title: "The brain",
                                  detail: "The MNI152 brain in the room. Turn it, size it, and slide the panes through it to the MRI beneath.",
                                  symbol: "brain") { openWindow(id: "brain") }
                    ConsoleButton(title: "The atlas",
                                  detail: "Region Atlas, Brodmann areas, tractography and the rest, as a window.",
                                  symbol: "rectangle.on.rectangle") { openWindow(id: "atlas") }
                }

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
                .frame(maxWidth: 640)
            }
            .padding(44)
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

    private func add(_ region: AtlasRegion, _ side: Atlas.Side) {
        atlas.add(region, side: side)
        openWindow(id: "brain")
    }
}

struct ConsoleButton: View {
    let title: String
    let detail: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 40, weight: .light))
                Text(title).font(.title2)
                Text(detail)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: 260, alignment: .leading)
            .padding(24)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.roundedRectangle(radius: 24))
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
