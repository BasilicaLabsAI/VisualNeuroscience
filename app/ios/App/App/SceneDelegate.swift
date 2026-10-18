import UIKit
import SwiftUI
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // The window holds the shell (Shell.swift): one system tab bar whose
        // pages open the web app's pages, each in a Capacitor bridge of its
        // own (ShellWeb.swift). Capacitor still hears about the scene below,
        // so links that come back to the app reach the pages' plugins.
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = UIHostingController(rootView: ShellRoot())
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
