import SwiftUI
import UIKit
import AuthenticationServices
import CryptoKit
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

/* The account, natively (v12.46, at the owner's word). The Account tab logs
   in and out with Firebase's own iOS SDK: Sign in with Apple, Google, and an
   email with a password, with Create account and a password reset; the
   pages inside the tabs could not be relied on for it (a TestFlight build
   sat on the account page's first line). Every page's bridge is told who is
   logged in as it opens (ShellWeb.swift writes window.VN_NATIVE_AUTH at
   document start) and the page's own SDK follows (site/assets/auth.js):
   with a custom token the auth worker mints from the native session's ID
   token, where the worker is deployed and named in Info.plist as
   VNAuthWorker, or with the credential the sign-in made where that can be
   used again, Google's tokens or an email and password. An Apple token is
   spent once, so an Apple sign-in reaches the pages only through the
   worker. A page that signs in by itself tells the shell, and the native
   layer follows the same two ways; a page that signs out signs it out. */

/// Who is logged in, as the Account tab shows it and the pages hear it.
nonisolated struct Person: Equatable, Sendable {
    let uid: String
    let email: String?
    let name: String?
    /// How they signed in: apple.com, google.com or password.
    let provider: String
}

nonisolated enum AccountError: Error {
    case noUser, noWorker, unread
}

/// The native account: Firebase's user, the ways in and out, and what the
/// pages are handed.
@MainActor
final class AccountAuth: ObservableObject {
    @Published private(set) var person: Person?
    @Published private(set) var busy = false
    /// The line under the controls: a wait, an error, or a word when done.
    @Published var note: String?

    /// The auth worker's address (Info.plist, VNAuthWorker): empty until the
    /// owner deploys the worker, and then the pages take the native session
    /// whatever the way in.
    nonisolated static let worker: String = ((Bundle.main.object(forInfoDictionaryKey: "VNAuthWorker") as? String) ?? "")
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .replacingOccurrences(of: "/+$", with: "", options: .regularExpression)

    /// A credential the pages can use once to sign their own SDK in.
    private var handoff: [String: String]?
    /// A custom token the worker minted for the pages, and when.
    private var pageToken: String?
    private var pageTokenAt: Date?
    private var appleNonce: String?
    private var minting = false
    private var listener: AuthStateDidChangeListenerHandle?

    init() {
        Self.configure()
        if let user = Auth.auth().currentUser { person = Self.person(of: user) }
        listener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            let now = user.map { Self.person(of: $0) }
            Task { @MainActor [weak self] in self?.became(now) }
        }
        if person != nil { mintPageToken() }
        restoreKept()
        if person != nil { warm() }
    }

    /// Firebase is configured once per process, by whoever asks first, this
    /// or a page's plugin; Google's sign-in takes the client ID from
    /// GoogleService-Info.plist as the plugin does.
    static func configure() {
        if FirebaseApp.app() == nil { FirebaseApp.configure() }
        if GIDSignIn.sharedInstance.configuration == nil, let clientID = FirebaseApp.app()?.options.clientID {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
    }

    nonisolated static func person(of user: User) -> Person {
        let provider = user.providerData.first?.providerID ?? "password"
        return Person(uid: user.uid, email: user.email, name: user.displayName, provider: provider)
    }

    private func became(_ now: Person?) {
        let changed = now != person
        person = now
        if now == nil {
            handoff = nil
            pageToken = nil
            pageTokenAt = nil
            dropKept()
        } else if changed || pageToken == nil {
            mintPageToken()
            if changed { warm(force: true) }
        }
    }

    // MARK: - The ways in and out

    func logIn(email: String, password: String) async {
        let email = Self.clean(email)
        guard !email.isEmpty, !password.isEmpty else { note = L("Give the email and the password."); return }
        await run(L("Logging in…")) {
            let _: Person = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Person, Error>) in
                Auth.auth().signIn(withEmail: email, password: password) { result, error in
                    Self.finish(cont, result?.user, error)
                }
            }
            self.handoff = ["provider": "password", "email": email, "password": password]
        }
    }

    func createAccount(email: String, password: String) async {
        let email = Self.clean(email)
        guard !email.isEmpty, !password.isEmpty else { note = L("Give the email and a password of six characters or more."); return }
        guard password.count >= 6 else { note = L("The password needs six characters or more."); return }
        await run(L("Creating the account…")) {
            let _: Person = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Person, Error>) in
                Auth.auth().createUser(withEmail: email, password: password) { result, error in
                    Self.finish(cont, result?.user, error)
                }
            }
            self.handoff = ["provider": "password", "email": email, "password": password]
        }
    }

    func sendReset(email: String) async {
        let email = Self.clean(email)
        guard !email.isEmpty else { note = L("Give the email first."); return }
        await run(L("Sending the email…"), done: L("Sent. Open the email and follow its link to choose a new password.")) {
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
                Auth.auth().sendPasswordReset(withEmail: email) { error in
                    if let error { cont.resume(throwing: error) } else { cont.resume() }
                }
            }
        }
    }

    func logInWithGoogle() async {
        guard let presenter = Self.presenter() else { note = L("The sign-in sheet has nowhere to open from. Try again."); return }
        await run(L("Opening Google…")) {
            let tokens: [String] = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<[String], Error>) in
                GIDSignIn.sharedInstance.signIn(withPresenting: presenter) { result, error in
                    if let error { cont.resume(throwing: error); return }
                    guard let user = result?.user, let id = user.idToken?.tokenString else {
                        cont.resume(throwing: AccountError.noUser)
                        return
                    }
                    cont.resume(returning: [id, user.accessToken.tokenString])
                }
            }
            let credential = GoogleAuthProvider.credential(withIDToken: tokens[0], accessToken: tokens[1])
            let _: Person = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Person, Error>) in
                Auth.auth().signIn(with: credential) { result, error in
                    Self.finish(cont, result?.user, error)
                }
            }
            self.handoff = ["provider": "google.com", "idToken": tokens[0], "accessToken": tokens[1]]
        }
    }

    /// Starts Sign in with Apple's request: a fresh nonce, hashed for Apple
    /// and kept raw for Firebase.
    func beginApple() -> String {
        let raw = Self.randomNonce()
        appleNonce = raw
        return Self.sha256(raw)
    }

    func finishApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let error):
            let words = Self.words(for: error)
            note = words.isEmpty ? nil : words
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken,
                  let token = String(data: data, encoding: .utf8),
                  let raw = appleNonce
            else {
                note = L("Apple sent no sign-in token. Try again.")
                return
            }
            appleNonce = nil
            let fullName = credential.fullName
            await run(L("Logging in with Apple…")) {
                let firebaseCredential = OAuthProvider.appleCredential(withIDToken: token, rawNonce: raw, fullName: fullName)
                let _: Person = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Person, Error>) in
                    Auth.auth().signIn(with: firebaseCredential) { result, error in
                        Self.finish(cont, result?.user, error)
                    }
                }
                // an Apple token is spent once: the pages get the worker's token, never this one
                self.handoff = nil
            }
        }
    }

    func logOut() {
        do {
            try Auth.auth().signOut()
        } catch {
            note = Self.words(for: error)
            return
        }
        GIDSignIn.sharedInstance.signOut()
        handoff = nil
        pageToken = nil
        pageTokenAt = nil
        dropKept()
        note = nil
    }

    // MARK: - The pages

    /// What a page is told as it opens (ShellWeb.swift): who is logged in,
    /// and a token or a credential its own SDK can sign in with. A token
    /// older than fifty minutes is renewed for the next page.
    func pageState() -> [String: Any] {
        guard let p = person else { return ["user": NSNull()] }
        var who: [String: Any] = ["uid": p.uid, "email": p.email ?? "", "provider": p.provider, "name": p.name ?? ""]
        if let user = Auth.auth().currentUser {
            let clock = ISO8601DateFormatter()
            if let made = user.metadata.creationDate { who["created"] = clock.string(from: made) }
            if let last = user.metadata.lastSignInDate { who["lastSignIn"] = clock.string(from: last) }
        }
        var state: [String: Any] = ["user": who]
        // the account as read at login (v12.54), for the page's copy on the device
        if let account, let read = try? JSONSerialization.jsonObject(with: account) { state["account"] = read }
        if let token = pageToken, let at = pageTokenAt, Date().timeIntervalSince(at) < 50 * 60 {
            state["token"] = token
        } else {
            mintPageToken()
        }
        if let handoff { state["handoff"] = handoff }
        return state
    }

    /// A page took the credential: it is spent, and the next page finds the
    /// SDK's own session.
    func handoffTaken() {
        handoff = nil
    }

    /// A page signed in by itself, the web way: the native layer follows,
    /// with the password an email sign-in used, or through the worker's
    /// exchange of the page's ID token.
    func pageSignedIn(provider: String, email: String?, password: String?, idToken: String?) {
        guard person == nil, !busy else { return }
        if provider == "password", let email, let password, !email.isEmpty, !password.isEmpty {
            Task { await self.logIn(email: email, password: password) }
        } else if let idToken, !idToken.isEmpty, !Self.worker.isEmpty {
            Task {
                await self.run(L("Logging in…")) {
                    let custom = try await Self.exchange(idToken: idToken)
                    let _: Person = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Person, Error>) in
                        Auth.auth().signIn(withCustomToken: custom) { result, error in
                            Self.finish(cont, result?.user, error)
                        }
                    }
                }
            }
        }
    }

    /// A page signed out: the native layer goes with it.
    func pageSignedOut() {
        if person != nil { logOut() }
    }

    /// Asks the auth worker for a custom token for the pages, from the
    /// native session's ID token.
    private func mintPageToken() {
        guard !Self.worker.isEmpty, !minting, let user = Auth.auth().currentUser else { return }
        minting = true
        user.getIDToken { [weak self] token, _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if let token, let minted = try? await Self.exchange(idToken: token) {
                    self.pageToken = minted
                    self.pageTokenAt = Date()
                }
                self.minting = false
            }
        }
    }

    /// The worker's exchange: the native session's ID token in, a custom
    /// token for the same person out.
    nonisolated static func exchange(idToken: String) async throws -> String {
        guard !worker.isEmpty, let url = URL(string: worker + "/auth/exchange") else { throw AccountError.noWorker }
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["idToken": idToken])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let body = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = body["token"] as? String, !token.isEmpty
        else { throw AccountError.noWorker }
        return token
    }

    // MARK: - The account kept on the device (v12.54, at the owner's word)

    /// What the account holds, read at login over Firestore's REST API with
    /// the native session's ID token, kept here and in UserDefaults, and
    /// handed to every page at document start (pageState; auth.js writes it
    /// into the device's copy before the page reads it, so the page pulls
    /// nothing): the profile, the tool index and each tool's files, as
    /// Firestore's REST documents, which the page decodes. Read again on each
    /// return to the front, at most once a minute, and at once when a page
    /// says it changed something.
    private var account: Data?
    private var accountAt: Date?
    private var reading = false
    private static let keptKey = "vn-account-kept"
    private static let keptForKey = "vn-account-kept-for"

    func warm(force: Bool = false) {
        guard let user = Auth.auth().currentUser, !reading else { return }
        if !force, let at = accountAt, Date().timeIntervalSince(at) < 60 { return }
        reading = true
        let uid = user.uid
        user.getIDToken { [weak self] token, _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                defer { self.reading = false }
                guard let token, let project = FirebaseApp.app()?.options.projectID,
                      let read = try? await Self.readAccount(uid: uid, token: token, project: project) else { return }
                self.account = read
                self.accountAt = Date()
                UserDefaults.standard.set(read, forKey: Self.keptKey)
                UserDefaults.standard.set(uid, forKey: Self.keptForKey)
            }
        }
    }

    /// The copy from the last run, for the person still logged in.
    private func restoreKept() {
        let defaults = UserDefaults.standard
        guard let uid = Auth.auth().currentUser?.uid, defaults.string(forKey: Self.keptForKey) == uid,
              let data = defaults.data(forKey: Self.keptKey) else { return }
        account = data
    }

    private func dropKept() {
        account = nil
        accountAt = nil
        UserDefaults.standard.removeObject(forKey: Self.keptKey)
        UserDefaults.standard.removeObject(forKey: Self.keptForKey)
    }

    /// The reads, as JSON for the page: {profile, toolindex, tools: {tool: list}, at}.
    nonisolated static func readAccount(uid: String, token: String, project: String) async throws -> Data {
        let base = "https://firestore.googleapis.com/v1/projects/\(project)/databases/(default)/documents/users/\(uid)"
        let profile = try await restGet(base + "/meta/profile", token: token)
        let index = try await restGet(base + "/meta/toolindex", token: token)
        var tools: Set<String> = ["regions", "practice"]
        if let fields = index?["fields"] as? [String: Any] { tools.formUnion(fields.keys) }
        var files: [String: Any] = [:]
        for tool in tools.sorted() {
            let path = tool.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? tool
            files[tool] = try await restGet(base + "/tools/\(path)/files?pageSize=300", token: token) ?? ["documents": [Any]()]
        }
        let read: [String: Any] = ["profile": profile ?? NSNull(), "toolindex": index ?? NSNull(), "tools": files,
                                   "at": Int(Date().timeIntervalSince1970 * 1000)]
        return try JSONSerialization.data(withJSONObject: read)
    }

    /// One GET: the JSON object, nil for a document that is not there.
    nonisolated private static func restGet(_ address: String, token: String) async throws -> [String: Any]? {
        guard let url = URL(string: address) else { throw AccountError.unread }
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 404 { return nil }
        guard status == 200 else { throw AccountError.unread }
        return try JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    // MARK: - Helpers

    /// Runs one step with the line showing the wait, then the error in plain
    /// words, or a word when it is done.
    private func run(_ wait: String, done: String? = nil, _ body: () async throws -> Void) async {
        if busy { return }
        busy = true
        note = wait
        defer { busy = false }
        do {
            try await body()
            note = done
        } catch {
            let words = Self.words(for: error)
            note = words.isEmpty ? nil : words
        }
    }

    nonisolated private static func finish(_ cont: CheckedContinuation<Person, Error>, _ user: User?, _ error: Error?) {
        if let error {
            cont.resume(throwing: error)
        } else if let user {
            cont.resume(returning: person(of: user))
        } else {
            cont.resume(throwing: AccountError.noUser)
        }
    }

    nonisolated static func clean(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    nonisolated static func randomNonce(_ length: Int = 32) -> String {
        let alphabet = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        return String((0..<length).map { _ in alphabet[Int.random(in: 0..<alphabet.count)] })
    }

    nonisolated static func sha256(_ text: String) -> String {
        SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    /// The view controller the sign-in sheets open from: the key window's
    /// topmost.
    private static func presenter() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let windows = scenes.flatMap { $0.windows }
        let window = windows.first { $0.isKeyWindow } ?? windows.first
        var top = window?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
    }

    /// Firebase's and Google's errors in the site's words; empty for a
    /// sign-in the person cancelled.
    nonisolated static func words(for error: Error) -> String {
        let nsError = error as NSError
        if let apple = error as? ASAuthorizationError, apple.code == .canceled { return "" }
        // Google's sign-in cancelled: its error domain and the code it gives (kGIDSignInErrorCodeCanceled)
        if nsError.domain == "com.google.GIDSignIn", nsError.code == -5 { return "" }
        if nsError.domain == "FIRAuthErrorDomain", let code = AuthErrorCode(rawValue: nsError.code) {
            switch code {
            case .wrongPassword, .invalidCredential: return L("Wrong email or password.")
            case .userNotFound: return L("No account uses that email. Create one below.")
            case .emailAlreadyInUse: return L("That email already has an account: log in instead.")
            case .accountExistsWithDifferentCredential: return L("That email already has an account another way: log in with it.")
            case .weakPassword: return L("The password needs six characters or more.")
            case .invalidEmail: return L("That is not an email address.")
            case .networkError: return L("No connection. Try again when you are back online.")
            case .tooManyRequests: return L("Too many tries. Wait a little and try again.")
            case .userDisabled: return L("That account has been disabled.")
            default: break
            }
        }
        return error.localizedDescription
    }
}
