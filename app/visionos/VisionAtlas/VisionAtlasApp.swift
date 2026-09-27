import SwiftUI

@main
struct VisionAtlasApp: App {
    var body: some Scene {
        // One window per id: each claims its id as it appears and a second
        // one for the same id closes itself, whether the app opened it by
        // mistake or visionOS brought it back from an earlier run.
        WindowGroup(id: "console") {
            ConsoleView().oneWindow("console")
        }
        .defaultSize(width: 960, height: 460)

        WindowGroup(id: "brain") {
            BrainVolumeView().oneWindow("brain")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)

        WindowGroup(id: "brain-console") {
            BrainConsoleView().oneWindow("brain-console")
        }
        .defaultSize(width: 640, height: 720)

        WindowGroup(id: "notes") {
            RegionNotesView().oneWindow("notes")
        }
        .defaultSize(width: 560, height: 720)

        WindowGroup(id: "brodmann") {
            BrodmannConsoleView().oneWindow("brodmann")
        }
        .defaultSize(width: 720, height: 860)

        WindowGroup(id: "tracts") {
            TractVolumeView().oneWindow("tracts")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)
    }
}

/// Holds the window's id for as long as the window is in the room. If another
/// window holds the id already, this one is a copy and closes itself.
struct OneWindow: ViewModifier {
    let id: String
    @State private var token = UUID()
    @Environment(\.dismissWindow) private var dismissWindow

    func body(content: Content) -> some View {
        content
            .onAppear { if !Atlas.shared.claimWindow(id, token) { dismissWindow() } }
            .onDisappear { Atlas.shared.releaseWindow(id, token) }
    }
}

extension View {
    func oneWindow(_ id: String) -> some View { modifier(OneWindow(id: id)) }
}

extension OpenWindowAction {
    /// Opens the window with this id unless one is in the room or on its way.
    @MainActor
    func once(_ id: String) {
        guard Atlas.shared.reserveWindow(id) else { return }
        callAsFunction(id: id)
    }
}
