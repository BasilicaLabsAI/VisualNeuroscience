import SwiftUI

@main
struct VisionAtlasApp: App {
    var body: some Scene {
        WindowGroup(id: "console") {
            ConsoleView()
        }
        .defaultSize(width: 960, height: 460)

        WindowGroup(id: "brain") {
            BrainVolumeView()
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)

        // The flat windows are single Window scenes, not groups: opening one
        // that is already in the room brings that window forward, wherever it
        // has been moved, instead of adding another copy of it.
        Window("Brain console", id: "brain-console") {
            BrainConsoleView()
        }
        .defaultSize(width: 640, height: 720)

        Window("What they do", id: "notes") {
            RegionNotesView()
        }
        .defaultSize(width: 560, height: 720)

        Window("Brodmann areas", id: "brodmann") {
            BrodmannConsoleView()
        }
        .defaultSize(width: 720, height: 860)

        WindowGroup(id: "tracts") {
            TractVolumeView()
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)
    }
}
