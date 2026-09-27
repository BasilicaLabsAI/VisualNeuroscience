import SwiftUI

@main
struct VisionAtlasApp: App {
    /// Shown on the console, so the build running on the headset can be told
    /// from the one before it. Bump it with every change to this app.
    static let build = "57"

    var body: some Scene {
        WindowGroup(id: "console") {
            ConsoleView()
        }
        .defaultSize(width: 960, height: 460)

        // Every window says when it is in the room, so the consoles open each
        // one once and afterwards add to it rather than opening another.
        // None of them is brought back when the app relaunches: visionOS
        // restores an app's windows by default, which filled the room with
        // copies at every run from Xcode, and RealityKit crashed setting up
        // a brain window restored that way. The app opens on its console
        // alone and everything else is opened afresh from it.
        WindowGroup(id: "brain") {
            BrainVolumeView().reportsOpen("brain")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)
        .restorationBehavior(.disabled)

        WindowGroup(id: "brain-console") {
            BrainConsoleView().reportsOpen("brain-console")
        }
        .defaultSize(width: 640, height: 720)
        .restorationBehavior(.disabled)

        WindowGroup(id: "notes") {
            RegionNotesView().reportsOpen("notes")
        }
        .defaultSize(width: 560, height: 720)
        .restorationBehavior(.disabled)

        WindowGroup(id: "brodmann") {
            BrodmannConsoleView().reportsOpen("brodmann")
        }
        .defaultSize(width: 720, height: 860)
        .restorationBehavior(.disabled)

        WindowGroup(id: "tracts") {
            TractVolumeView().reportsOpen("tracts")
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)
        .restorationBehavior(.disabled)
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
