import SwiftUI

/// The window the app opens with: one button per thing it can put in the room.
struct ConsoleView: View {
    @Environment(\.openWindow) private var openWindow

    var body: some View {
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
                              detail: "The MNI152 brain in the room, with its own console for slicing it and highlighting regions.",
                              symbol: "brain") {
                    /* the brain opens its console itself; if both are in
                       the room already there is nothing to open */
                    if !Atlas.shared.isOpen("brain") { openWindow(id: "brain") }
                    else if !Atlas.shared.isOpen("brain-console") { openWindow(id: "brain-console") }
                }
                ConsoleButton(title: "Brodmann areas",
                              detail: "The 41 areas searchable by what they do, and drawn on the brain when you ask.",
                              symbol: "square.grid.3x3") { if !Atlas.shared.isOpen("brodmann") { openWindow(id: "brodmann") } }
                ConsoleButton(title: "Tractography",
                              detail: "The HCP1065 white-matter tracts in the room, coloured by direction.",
                              symbol: "point.3.connected.trianglepath.dotted") { if !Atlas.shared.isOpen("tracts") { openWindow(id: "tracts") } }
            }
        }
        .padding(44)
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
            .frame(width: 230, alignment: .leading)
            .padding(24)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.roundedRectangle(radius: 24))
    }
}
