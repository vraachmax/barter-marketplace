import SwiftUI

@main
struct BarterMobileApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(BarterPalette.orange)
        }
    }
}

enum BarterPalette {
    static let orange = Color(red: 1.0, green: 0.40, blue: 0.14)
    static let foreground = Color(red: 0.13, green: 0.14, blue: 0.16)
    static let canvas = Color(uiColor: .systemBackground)
    static let secondary = Color(uiColor: .secondarySystemBackground)
}

struct RootView: View {
    @State private var selection: Tab = .home

    enum Tab: Hashable {
        case home, favorites, create, messages, profile
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Главная", systemImage: "house") }
                .tag(Tab.home)
            PlaceholderView(name: "Избранное", detail: "Появится после подключения авторизации", icon: "heart")
                .tabItem { Label("Избранное", systemImage: "heart") }
                .tag(Tab.favorites)
            PlaceholderView(name: "Разместить", detail: "Мастер публикации ещё не перенесён", icon: "plus.circle")
                .tabItem { Label("Разместить", systemImage: "plus.circle.fill") }
                .tag(Tab.create)
            PlaceholderView(name: "Сообщения", detail: "Чаты будут подключены после безопасной авторизации", icon: "bubble.left.and.bubble.right")
                .tabItem { Label("Сообщения", systemImage: "bubble.left.and.bubble.right") }
                .tag(Tab.messages)
            PlaceholderView(name: "Профиль", detail: "Подключение учётной записи — следующий этап", icon: "person.crop.circle")
                .tabItem { Label("Профиль", systemImage: "person.crop.circle") }
                .tag(Tab.profile)
        }
    }
}

struct PlaceholderView: View {
    let name: String
    let detail: String
    let icon: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 42))
                .foregroundStyle(BarterPalette.orange)
            Text(name).font(.title2.bold())
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BarterPalette.canvas)
    }
}
