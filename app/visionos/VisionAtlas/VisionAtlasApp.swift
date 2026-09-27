import SwiftUI

@main
struct VisionAtlasApp: App {
    var body: some Scene {
        WindowGroup(id: "console") {
            ConsoleView()
        }
        .defaultSize(width: 960, height: 460)

        // Every other window is keyed by its own id, and always opened with
        // that key, so the system holds one window per id: a second request
        // reaches the window already in the room rather than adding a copy.
        // Each window also reports itself open while it is in the room, so
        // the consoles ask for it only when it is not there.
        WindowGroup(id: "brain", for: String.self) { _ in
            BrainVolumeView().reportsOpen("brain")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)

        WindowGroup(id: "brain-console", for: String.self) { _ in
            BrainConsoleView().reportsOpen("brain-console")
        }
        .defaultSize(width: 640, height: 720)

        WindowGroup(id: "notes", for: String.self) { _ in
            RegionNotesView().reportsOpen("notes")
        }
        .defaultSize(width: 560, height: 720)

        WindowGroup(id: "brodmann", for: String.self) { _ in
            BrodmannConsoleView().reportsOpen("brodmann")
        }
        .defaultSize(width: 720, height: 860)

        WindowGroup(id: "tracts", for: String.self) { _ in
            TractVolumeView().reportsOpen("tracts")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)
    }
}

extension View {
    /// Marks the window this view fills as open for as long as it is in the
    /// room, by the id its scene was declared with.
    @MainActor
    func reportsOpen(_ id: String) -> some View {
        onAppear { Atlas.shared.windowAppeared(id) }
            .onDisappear { Atlas.shared.windowDisappeared(id) }
    }
}

extension OpenWindowAction {
    /// Opens the window with this id unless it is in the room already, and
    /// opens it keyed by the id itself, so that even a repeated request goes
    /// to the one window rather than making another.
    @MainActor
    func once(_ id: String) {
        guard !Atlas.shared.isOpen(id) else { return }
        Atlas.shared.windowAppeared(id)
        callAsFunction(id: id, value: id)
    }
}
