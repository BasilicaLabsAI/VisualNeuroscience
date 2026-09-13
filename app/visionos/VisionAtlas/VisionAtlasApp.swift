import SwiftUI

@main
struct VisionAtlasApp: App {
    var body: some Scene {
        WindowGroup(id: "console") {
            ConsoleView()
        }
        .defaultSize(width: 760, height: 460)

        WindowGroup(id: "brain") {
            BrainVolumeView()
        }
        .windowStyle(.volumetric)
        .defaultSize(width: 0.7, height: 0.7, depth: 0.7, in: .meters)

        WindowGroup(id: "brain-console") {
            BrainConsoleView()
        }
        .defaultSize(width: 640, height: 720)

        WindowGroup(id: "atlas") {
            AtlasWindow()
        }
        .defaultSize(width: 1500, height: 1000)
    }
}
