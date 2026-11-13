import SwiftUI

// gmww://rooms mở app vào Quản lý phòng (dùng cho thông báo "có phòng mới").
// The link can arrive before the web runtime is ready, so it stays pending until the page confirms it.
enum GMWWDeepLink {
    static let notification = Notification.Name("GMWWDeepLinkReceived")
    static var pendingTarget: String?

    static func receive(_ url: URL) {
        guard url.scheme?.lowercased() == "gmww", url.host?.lowercased() == "rooms" else { return }
        pendingTarget = "rooms"
        NotificationCenter.default.post(name: notification, object: nil)
    }
}

@main
struct GMWW_ServerApp: App {
    var body: some Scene {
        WindowGroup { GameView().onOpenURL { GMWWDeepLink.receive($0) } }
    }
}
