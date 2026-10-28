import SwiftUI

@main
struct DogusKatPlaniApp: App {
    var body: some Scene {
        WindowGroup {
            WebContainer()
                .ignoresSafeArea(edges: .bottom)
        }
    }
}

struct WebContainer: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebVC { WebVC() }
    func updateUIViewController(_ vc: WebVC, context: Context) {}
}
