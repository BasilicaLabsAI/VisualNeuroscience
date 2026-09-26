import SwiftUI

@main
struct VisionAtlasApp: App {
    var body: some Scene {
        WindowGroup(id: "console") {
            ConsoleView()
        }
        .defaultSize(width: 960, height: 460)

        // Every window says when it is in the room, so the consoles open each
        // one once and afterwards add to it rather than opening another.
        WindowGroup(id: "brain") {
            BrainVolumeView().reportsOpen("brain")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)

        WindowGroup(id: "brain-console") {
            BrainConsoleView().reportsOpen("brain-console")
        }
        .defaultSize(width: 640, height: 720)

        WindowGroup(id: "notes") {
            RegionNotesView().reportsOpen("notes")
        }
        .defaultSize(width: 560, height: 720)

        WindowGroup(id: "brodmann") {
            BrodmannConsoleView().reportsOpen("brodmann")
        }
        .defaultSize(width: 720, height: 860)

        WindowGroup(id: "tracts") {
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
