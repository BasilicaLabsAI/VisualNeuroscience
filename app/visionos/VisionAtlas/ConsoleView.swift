import SwiftUI

/// The window the app opens with: one button per thing it can put in the
/// room, and one that opens the atlas as it is on the web.
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
                    openWindow(id: "brain")
                    openWindow(id: "brain-console")
                }
                ConsoleButton(title: "The atlas",
                              detail: "Region Atlas, Brodmann areas, tractography and the rest, as a window.",
                              symbol: "rectangle.on.rectangle") { openWindow(id: "atlas") }
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
            .frame(width: 260, alignment: .leading)
            .padding(24)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.roundedRectangle(radius: 24))
    }
}
