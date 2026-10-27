import SwiftUI
import WebKit
import UIKit
import AudioToolbox
import CryptoKit
import UniformTypeIdentifiers

struct GameView: View {
    var body: some View {
        GameWebView()
            .ignoresSafeArea(.container, edges: .bottom)
            .background(Color.black)
    }
}

struct GameWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.userContentController.add(context.coordinator, name: "gmwwUpdater")
        config.userContentController.add(context.coordinator, name: "gmwwHaptic")
        config.userContentController.add(context.coordinator, name: "gmwwScreen")

        let shellVersion = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
        let escapedVersion = shellVersion.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        // A freshly installed IPA contains a complete runtime with the same version.
        // Do not let a stale Application Support runtime from an older install override it.
        if let active = UserDefaults.standard.string(forKey: "GMWWActiveRuntimeVersion"),
           String(active.split(separator: "-").first ?? "").compare(shellVersion, options: .numeric) == .orderedAscending {
            UserDefaults.standard.removeObject(forKey: "GMWWActiveRuntimeVersion")
        }
        let bridgeScript = "window.GMWW_NATIVE_SHELL_VERSION='\(escapedVersion)';window.GMWW_NATIVE_UPDATER=true;window.GMWW_NATIVE_MANUAL_RUNTIME=true;"
        config.userContentController.addUserScript(WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = false
        web.backgroundColor = .black
        context.coordinator.webView = web
        context.coordinator.observeAppState()
        context.coordinator.loadInitialRuntime(in: web)
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwUpdater")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwHaptic")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "gmwwScreen")
        coordinator.stopObservingAppState()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIDocumentPickerDelegate {
        weak var webView: WKWebView?
        private let activeRuntimeKey = "GMWWActiveRuntimeVersion"
        private var demoAwakeRequested = false
        private var runtimeInstallBusy = false
        private let previousRuntimeKey = "GMWWPreviousRuntimeVersion"

        // Keep the display awake only while DEMO is actively playing in the foreground.
        func observeAppState() {
            NotificationCenter.default.addObserver(self, selector: #selector(appWillResignActive(_:)),
                                                   name: UIApplication.willResignActiveNotification, object: nil)
            NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive(_:)),
                                                   name: UIApplication.didBecomeActiveNotification, object: nil)
        }

        func stopObservingAppState() {
            NotificationCenter.default.removeObserver(self)
            demoAwakeRequested = false
            UIApplication.shared.isIdleTimerDisabled = false
        }

        private func syncIdleTimer() {
            UIApplication.shared.isIdleTimerDisabled =
                demoAwakeRequested && UIApplication.shared.applicationState == .active
        }

        @objc private func appWillResignActive(_ notification: Notification) {
            UIApplication.shared.isIdleTimerDisabled = false
        }

        @objc private func appDidBecomeActive(_ notification: Notification) {
            syncIdleTimer()
        }

        private struct RuntimeFile: Decodable {
            let path: String
            let url: String
            let sha256: String
        }

        private struct RuntimePackage: Decodable {
            let files: [RuntimeFile]
        }

        private struct UpdateManifest: Decodable {
            let releaseVersion: String?
            let runtimeVersion: String?
            let minimumShellVersion: String?
            let runtime: RuntimePackage?
            let delete: [String]?
        }

        private func runtimeRoot() throws -> URL {
            guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
                throw NSError(domain: "GMWWUpdater", code: 1, userInfo: [NSLocalizedDescriptionKey: "Không tìm thấy thư mục Application Support."])
            }
            let root = base.appendingPathComponent("GMWWRuntime", isDirectory: true)
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            return root
        }

        private func activeRuntimeHTML() -> URL? {
            guard let version = UserDefaults.standard.string(forKey: activeRuntimeKey),
                  !version.isEmpty,
                  let root = try? runtimeRoot() else { return nil }
            let html = root.appendingPathComponent(version, isDirectory: true).appendingPathComponent("GMWW.html")
            return FileManager.default.fileExists(atPath: html.path) ? html : nil
        }

        func loadInitialRuntime(in webView: WKWebView) {
            if let runtime = activeRuntimeHTML() {
                webView.loadFileURL(runtime, allowingReadAccessTo: runtime.deletingLastPathComponent())
                return
            }
            if let bundled = Bundle.main.url(forResource: "GMWW", withExtension: "html", subdirectory: "Web") {
                webView.loadFileURL(bundled, allowingReadAccessTo: bundled.deletingLastPathComponent())
            }
        }

        private func present(_ alert: UIAlertController, from webView: WKWebView) {
            guard var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            controller.present(alert, animated: true)
        }

        private func presentShare(fileURL: URL, from webView: WKWebView) {
            guard var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            let share = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
            if let pop = share.popoverPresentationController {
                pop.sourceView = webView
                pop.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            }
            share.completionWithItemsHandler = { _, _, _, _ in
                try? FileManager.default.removeItem(at: fileURL)
            }
            controller.present(share, animated: true)
        }

        private func sendResult(_ payload: [String: Any], to webView: WKWebView) {
            guard JSONSerialization.isValidJSONObject(payload),
                  let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async {
                webView.evaluateJavaScript("window.GMWWUpdateNative?.onResult(\(json));")
            }
        }

        private func allowedRuntimeURL(_ url: URL) -> Bool {
            guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased() else { return false }
            return host == "gmww-v2-00.williampham0702.workers.dev"
        }

        private func allowedIPAURL(_ url: URL) -> Bool {
            guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased() else { return false }
            return host == "github.com" || host == "api.github.com" || host.hasSuffix(".githubusercontent.com") || host == "gmww-v2-00.williampham0702.workers.dev"
        }

        private func sha256(_ data: Data) -> String {
            SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        }

        private func safeRelativePath(_ path: String) -> Bool {
            guard !path.isEmpty, !path.hasPrefix("/"), !path.contains(".."), !path.contains("\\") else { return false }
            return path.split(separator: "/").allSatisfy { !$0.isEmpty && $0 != "." }
        }

        private func installRuntime(manifestObject: [String: Any], webView: WKWebView, localFiles: [String: (offset: UInt64, size: Int)]? = nil, packageURL: URL? = nil) {
            guard JSONSerialization.isValidJSONObject(manifestObject),
                  let data = try? JSONSerialization.data(withJSONObject: manifestObject),
                  let manifest = try? JSONDecoder().decode(UpdateManifest.self, from: data),
                  let runtime = manifest.runtime,
                  !runtime.files.isEmpty else {
                sendResult(["ok": false, "action": "installRuntime", "error": "Gói cập nhật runtime không hợp lệ."], to: webView)
                return
            }

            let version = (manifest.runtimeVersion ?? manifest.releaseVersion ?? "").replacingOccurrences(of: "V", with: "")
            guard version.range(of: "^[0-9]+\\.[0-9]+(?:\\.[0-9]+)?$", options: .regularExpression) != nil else {
                sendResult(["ok": false, "action": "installRuntime", "error": "Thiếu phiên bản runtime."], to: webView)
                return
            }

            guard !runtimeInstallBusy else { return }
            runtimeInstallBusy = true
            Task {
                defer {
                    runtimeInstallBusy = false
                    if let packageURL { try? FileManager.default.removeItem(at: packageURL) }
                }
                var staging: URL?
                do {
                    let packageHandle = try packageURL.map { try FileHandle(forReadingFrom: $0) }
                    defer { try? packageHandle?.close() }
                    let root = try runtimeRoot()
                    let temp = root.appendingPathComponent(".staging-\(UUID().uuidString)", isDirectory: true)
                    staging = temp

                    if let active = activeRuntimeHTML()?.deletingLastPathComponent() {
                        try FileManager.default.copyItem(at: active, to: temp)
                    } else if let resources = Bundle.main.resourceURL {
                        let bundledWeb = resources.appendingPathComponent("Web", isDirectory: true)
                        guard FileManager.default.fileExists(atPath: bundledWeb.path) else {
                            throw NSError(domain: "GMWWUpdater", code: 7, userInfo: [NSLocalizedDescriptionKey: "Không tìm thấy Web runtime gốc trong IPA."])
                        }
                        try FileManager.default.copyItem(at: bundledWeb, to: temp)
                    } else {
                        throw NSError(domain: "GMWWUpdater", code: 8, userInfo: [NSLocalizedDescriptionKey: "Không tìm thấy tài nguyên ứng dụng."])
                    }

                    for path in manifest.delete ?? [] {
                        guard safeRelativePath(path) else { continue }
                        let target = temp.appendingPathComponent(path)
                        if FileManager.default.fileExists(atPath: target.path) {
                            try FileManager.default.removeItem(at: target)
                        }
                    }

                    for item in runtime.files {
                        guard safeRelativePath(item.path),
                              let remote = URL(string: item.url),
                              allowedRuntimeURL(remote) else {
                            throw NSError(domain: "GMWWUpdater", code: 2, userInfo: [NSLocalizedDescriptionKey: "File cập nhật không hợp lệ: \(item.path)"])
                        }
                        let fileData: Data
                        if let localFiles {
                            guard let entry = localFiles[item.path], let packageHandle else {
                                throw NSError(domain: "GMWWUpdater", code: 9, userInfo: [NSLocalizedDescriptionKey: "Gói thủ công thiếu file hoặc dữ liệu hỏng: \(item.path)"])
                            }
                            try packageHandle.seek(toOffset: entry.offset)
                            fileData = try packageHandle.read(upToCount: entry.size) ?? Data()
                            guard fileData.count == entry.size else { throw manualError("File cập nhật bị cắt ngắn.") }
                        } else {
                            let (downloaded, response) = try await URLSession.shared.data(from: remote)
                            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                                throw NSError(domain: "GMWWUpdater", code: 3, userInfo: [NSLocalizedDescriptionKey: "Không tải được \(item.path)."])
                            }
                            fileData = downloaded
                        }
                        guard sha256(fileData).lowercased() == item.sha256.lowercased() else {
                            throw NSError(domain: "GMWWUpdater", code: 4, userInfo: [NSLocalizedDescriptionKey: "Checksum không khớp: \(item.path)"])
                        }

                        let target = temp.appendingPathComponent(item.path)
                        try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                        try fileData.write(to: target, options: .atomic)
                    }

                    let html = temp.appendingPathComponent("GMWW.html")
                    guard FileManager.default.fileExists(atPath: html.path) else {
                        throw NSError(domain: "GMWWUpdater", code: 5, userInfo: [NSLocalizedDescriptionKey: "Gói cập nhật thiếu GMWW.html."])
                    }

                    // Commit to a unique directory: never remove the active runtime before success.
                    let installedDirectory = version + "-" + UUID().uuidString
                    let final = root.appendingPathComponent(installedDirectory, isDirectory: true)
                    if FileManager.default.fileExists(atPath: final.path) {
                        try FileManager.default.removeItem(at: final)
                    }
                    try FileManager.default.moveItem(at: temp, to: final)
                    staging = nil
                    UserDefaults.standard.set(UserDefaults.standard.string(forKey: activeRuntimeKey), forKey: previousRuntimeKey)
                    UserDefaults.standard.set(installedDirectory, forKey: activeRuntimeKey)
                    sendResult(["ok": true, "action": "installRuntime", "version": version], to: webView)
                } catch {
                    if let staging { try? FileManager.default.removeItem(at: staging) }
                    sendResult(["ok": false, "action": "installRuntime", "error": error.localizedDescription], to: webView)
                }
            }
        }

        private func pickRuntimePackage(from webView: WKWebView) {
            guard !runtimeInstallBusy, var controller = webView.window?.rootViewController else { return }
            while let presented = controller.presentedViewController { controller = presented }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.data], asCopy: true)
            picker.allowsMultipleSelection = false
            picker.delegate = self
            controller.present(picker, animated: true)
        }

        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            if let webView { sendResult(["cancelled": true, "action": "installRuntime"], to: webView) }
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first, let webView else { return }
            // Import only an explicitly chosen file. Parsing runs away from UI rendering.
            DispatchQueue.global(qos: .userInitiated).async {
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                var retainedPackage: URL?
                do {
                    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                    guard size > 0, size <= 515 * 1024 * 1024 else { throw self.manualError("File cập nhật quá lớn hoặc rỗng.") }
                    let copy = FileManager.default.temporaryDirectory.appendingPathComponent("GMWW-manual-" + UUID().uuidString)
                    try FileManager.default.copyItem(at: url, to: copy)
                    retainedPackage = copy
                    let handle = try FileHandle(forReadingFrom: copy)
                    defer { try? handle.close() }
                    let magic = Data("GMWWRUNTIME2\n".utf8)
                    guard try handle.read(upToCount: magic.count) == magic,
                          let lengthBytes = try handle.read(upToCount: 4), lengthBytes.count == 4 else { throw self.manualError("Không phải gói GMWW hợp lệ.") }
                    let headerSize = lengthBytes.reduce(0) { ($0 << 8) | Int($1) }
                    guard headerSize > 0, headerSize <= 2 * 1024 * 1024,
                          let data = try handle.read(upToCount: headerSize), data.count == headerSize,
                          let package = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                          package["format"] as? String == "gmww-runtime-2",
                          let manifestObject = package["manifest"] as? [String: Any],
                          let lengths = package["lengths"] as? [String: Int] else { throw self.manualError("Header gói cập nhật không hợp lệ.") }
                    let manifestData = try JSONSerialization.data(withJSONObject: manifestObject)
                    let manifest = try JSONDecoder().decode(UpdateManifest.self, from: manifestData)
                    let version = manifest.runtimeVersion ?? ""
                    guard version.range(of: "^[0-9]+\\.[0-9]+(?:\\.[0-9]+)?$", options: .regularExpression) != nil,
                          let entries = manifest.runtime?.files, !entries.isEmpty else { throw self.manualError("Thiếu phiên bản hoặc danh sách file.") }
                    let shell = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
                    guard shell.compare(manifest.minimumShellVersion ?? "0", options: .numeric) != .orderedAscending else { throw self.manualError("Gói này cần IPA mới hơn.") }
                    guard version.compare(shell, options: .numeric) != .orderedAscending else { throw self.manualError("Gói Runtime cũ hơn bản đã có trong IPA.") }
                    let paths = entries.map { $0.path }
                    guard Set(paths).count == paths.count, Set(paths) == Set(lengths.keys),
                          ["GMWW.html", "app.js", "style.css"].allSatisfy({ paths.contains($0) }),
                          (manifest.delete ?? []).allSatisfy({ self.safeRelativePath($0) }) else { throw self.manualError("Danh sách file thiếu, trùng hoặc không an toàn.") }
                    var total = 0
                    var offset = UInt64(magic.count + 4 + headerSize)
                    var files: [String: (offset: UInt64, size: Int)] = [:]
                    for item in entries {
                        guard self.safeRelativePath(item.path), let remote = URL(string: item.url), self.allowedRuntimeURL(remote),
                              let length = lengths[item.path], length >= 0, length <= 16 * 1024 * 1024,
                              let bytes = try handle.read(upToCount: length), bytes.count == length,
                              self.sha256(bytes) == item.sha256.lowercased() else { throw self.manualError("SHA-256 hoặc đường dẫn không hợp lệ: \(item.path)") }
                        files[item.path] = (offset, length)
                        offset += UInt64(length)
                        total += length
                        guard total <= 512 * 1024 * 1024 else { throw self.manualError("Gói cập nhật vượt giới hạn dung lượng.") }
                    }
                    guard offset == UInt64(size) else { throw self.manualError("Gói cập nhật có dữ liệu thừa hoặc bị thiếu.") }
                    let verifiedFiles = files
                    let notes = (manifestObject["releaseNotes"] as? [String] ?? []).prefix(3).joined(separator: "\n")
                    DispatchQueue.main.async {
                        let alert = UIAlertController(title: "Cài Runtime V" + version + "?", message: notes + "\n\nChỉ cài file nhận từ bản phát hành GMWW tin cậy. SHA-256 đã khớp; dữ liệu ván được giữ nguyên.", preferredStyle: .alert)
                        alert.addAction(UIAlertAction(title: "Hủy", style: .cancel) { _ in try? FileManager.default.removeItem(at: copy); self.sendResult(["cancelled": true, "action": "installRuntime"], to: webView) })
                        alert.addAction(UIAlertAction(title: "Cài cập nhật", style: .default) { _ in self.installRuntime(manifestObject: manifestObject, webView: webView, localFiles: verifiedFiles, packageURL: copy) })
                        self.present(alert, from: webView)
                    }
                } catch {
                    if let retainedPackage { try? FileManager.default.removeItem(at: retainedPackage) }
                    self.sendResult(["ok": false, "action": "installRuntime", "error": error.localizedDescription], to: webView)
                }
            }
        }

        private func manualError(_ message: String) -> NSError {
            NSError(domain: "GMWWUpdater", code: 10, userInfo: [NSLocalizedDescriptionKey: message])
        }

        private func downloadIPA(urlString: String, fileName: String, webView: WKWebView) {
            guard let remote = URL(string: urlString), allowedIPAURL(remote) else {
                sendResult(["ok": false, "action": "downloadIPA", "error": "Đường dẫn IPA không hợp lệ."], to: webView)
                return
            }

            Task {
                do {
                    let (tempURL, response) = try await URLSession.shared.download(from: remote)
                    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                        throw NSError(domain: "GMWWUpdater", code: 6, userInfo: [NSLocalizedDescriptionKey: "Không tải được IPA."])
                    }
                    let safeName = fileName.isEmpty ? "GMWW.ipa" : fileName.replacingOccurrences(of: "/", with: "-")
                    let shareURL = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
                    try? FileManager.default.removeItem(at: shareURL)
                    try FileManager.default.moveItem(at: tempURL, to: shareURL)
                    await MainActor.run {
                        self.presentShare(fileURL: shareURL, from: webView)
                        self.sendResult(["ok": true, "action": "downloadIPA", "fileName": safeName], to: webView)
                    }
                } catch {
                    sendResult(["ok": false, "action": "downloadIPA", "error": error.localizedDescription], to: webView)
                }
            }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "gmwwScreen" {
                guard message.frameInfo.isMainFrame,
                      let body = message.body as? [String: Any],
                      body["action"] as? String == "setDemoAwake",
                      let enabled = body["enabled"] as? Bool else { return }
                DispatchQueue.main.async { [weak self] in
                    self?.demoAwakeRequested = enabled
                    self?.syncIdleTimer()
                }
                return
            }
            if message.name == "gmwwHaptic" {
                guard message.frameInfo.isMainFrame,
                      let body = message.body as? [String: Any],
                      body["event"] as? String == "action-confirmed" else { return }
                DispatchQueue.main.async {
                    // UIKit tap feedback can be subtle on some iPhones. Add native
                    // system vibration for a confirmed action, not for every render.
                    let feedback = UINotificationFeedbackGenerator()
                    feedback.prepare()
                    feedback.notificationOccurred(.success)
                    if UIDevice.current.userInterfaceIdiom == .phone {
                        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                    }
                }
                return
            }
            guard message.name == "gmwwUpdater",
                  let body = message.body as? [String: Any],
                  let action = body["action"] as? String,
                  let webView else { return }

            switch action {
            case "pickRuntimePackage":
                pickRuntimePackage(from: webView)
            case "installRuntime":
                guard let manifest = body["manifest"] as? [String: Any] else {
                    sendResult(["ok": false, "action": action, "error": "Thiếu manifest cập nhật."], to: webView)
                    return
                }
                installRuntime(manifestObject: manifest, webView: webView)
            case "downloadIPA":
                downloadIPA(urlString: body["url"] as? String ?? "", fileName: body["fileName"] as? String ?? "", webView: webView)
            case "restartRuntime":
                loadInitialRuntime(in: webView)
            case "rollbackRuntime":
                UserDefaults.standard.set(UserDefaults.standard.string(forKey: previousRuntimeKey), forKey: activeRuntimeKey)
                UserDefaults.standard.removeObject(forKey: previousRuntimeKey)
                loadInitialRuntime(in: webView)
                sendResult(["ok": true, "action": "rollbackRuntime"], to: webView)
            default:
                sendResult(["ok": false, "action": action, "error": "Hành động cập nhật không được hỗ trợ."], to: webView)
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            demoAwakeRequested = false
            syncIdleTimer()
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            demoAwakeRequested = false
            syncIdleTimer()
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            guard webView.window != nil else { completionHandler(); return }
            let alert = UIAlertController(title: "GMWW", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            present(alert, from: webView)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard webView.window != nil else { completionHandler(false); return }
            let alert = UIAlertController(title: "Xác nhận", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Huỷ", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            present(alert, from: webView)
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               !url.isFileURL,
               navigationAction.targetFrame?.isMainFrame != false,
               let scheme = url.scheme?.lowercased(),
               scheme == "http" || scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}
