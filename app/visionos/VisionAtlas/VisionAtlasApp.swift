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

        WindowGroup(id: "brain-console") {
            BrainConsoleView()
        }
        .defaultSize(width: 640, height: 720)

        WindowGroup(id: "notes") {
            RegionNotesView()
        }
        .defaultSize(width: 560, height: 720)

        WindowGroup(id: "brodmann") {
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
