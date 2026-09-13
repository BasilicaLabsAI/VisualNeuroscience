import SwiftUI

/// What the highlighted regions do, in their colours: the AAL regions
/// stacked by layer as the Region Atlas stacks them, then any Brodmann areas
/// the checkbox has put on the brain.
struct RegionNotesView: View {
    @State private var atlas = Atlas.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("What they do")
                    .font(.system(size: 30, weight: .light, design: .serif))

                if !atlas.anythingHighlighted {
                    Text("Nothing is highlighted. Add a region from the brain's console, or tick an area in the Brodmann window, and its function appears here.")
                        .foregroundStyle(.secondary)
                }

                ForEach(AtlasRegions.tiers, id: \.self) { tier in
                    let here = atlas.selections.filter { AtlasRegions.notes[$0.base]?.tier == tier.id }
                    if !here.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(tier.label).font(.headline)
                                Text(tier.sub).font(.caption).foregroundStyle(.secondary)
                            }
                            ForEach(here) { s in
                                HStack(alignment: .top, spacing: 12) {
                                    Circle().fill(Color(UIColor(hex: s.colour))).frame(width: 14, height: 14).padding(.top, 4)
                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack(spacing: 8) {
                                            Text(s.name).font(.body.weight(.semibold))
                                            if !s.sideTag.isEmpty { Text(s.sideTag).font(.caption).foregroundStyle(.secondary) }
                                        }
                                        Text(AtlasRegions.notes[s.base]?.function ?? "")
                                    }
                                }
                            }
                        }
                        .padding(20)
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))
                    }
                }

                if atlas.showBrodmann, !atlas.brodmann.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .firstTextBaseline) {
                            Text("Brodmann areas").font(.headline)
                            Text("both hemispheres in one label").font(.caption).foregroundStyle(.secondary)
                        }
                        ForEach(atlas.brodmann) { pick in
                            if let area = pick.area {
                                HStack(alignment: .top, spacing: 12) {
                                    Circle().fill(Color(UIColor(hex: pick.colour))).frame(width: 14, height: 14).padding(.top, 4)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Area \(area.ba) · \(area.name)").font(.body.weight(.semibold))
                                        Text(area.function)
                                        if !area.note.isEmpty { Text(area.note).font(.callout).foregroundStyle(.secondary) }
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24))
                }
            }
            .padding(32)
        }
    }
}
