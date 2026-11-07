import SwiftUI

@MainActor
final class HomeModel: ObservableObject {
    @Published var listings: [ListingDTO] = []
    @Published var categories: [CategoryDTO] = []
    @Published var loading = false
    @Published var error: String?
    @Published var categoryError: String?
    private var generation = 0

    func load(base: String, mode: CatalogMode, query: String, categoryId: String?) async {
        generation += 1
        let requestID = generation
        loading = true
        error = nil
        listings = []
        do {
            let api = try CatalogAPI(rawBaseURL: base)
            let feed = try await api.listings(mode: mode, query: query, categoryId: categoryId)
            guard requestID == generation else { return }
            listings = feed.items
        } catch {
            guard requestID == generation else { return }
            self.error = error.localizedDescription
        }
        if requestID == generation { loading = false }
    }

    func loadCategories(base: String) async {
        categories = []
        categoryError = nil
        do {
            let api = try CatalogAPI(rawBaseURL: base)
            categories = try await api.categories()
        } catch {
            categoryError = "Категории не загрузились"
        }
    }
}

struct HomeView: View {
    @AppStorage("barter.prototype.apiBaseURL") private var apiBaseURL = ""
    @StateObject private var model = HomeModel()
    @State private var mode: CatalogMode = .market
    @State private var query = ""
    @State private var appliedQuery = ""
    @State private var categoryId: String?
    @State private var showSettings = false

    private var requestKey: String {
        "\(apiBaseURL)|\(mode.rawValue)|\(appliedQuery)|\(categoryId ?? "")"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    searchBar
                    modeSelector
                    Text(mode.hint)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                    categoryStrip
                    if appliedQuery.isEmpty && categoryId == nil {
                        hero
                    }
                    HStack {
                        Text(appliedQuery.isEmpty ? "Для вас" : "Результаты поиска")
                            .font(.system(size: 22, weight: .bold))
                        Spacer()
                        if !appliedQuery.isEmpty {
                            Button("Сбросить") {
                                query = ""
                                appliedQuery = ""
                            }
                            .font(.subheadline)
                        }
                    }
                    .padding(.top, 2)
                    feed
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
            .background(BarterPalette.canvas)
            .safeAreaInset(edge: .top, spacing: 0) {
                header
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showSettings) {
                NavigationStack {
                    Form {
                        Section("Подключение к существующему API") {
                            TextField("https://api.example.com", text: $apiBaseURL)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .keyboardType(.URL)
                                .accessibilityLabel("Адрес API")
                            Text("Только HTTPS. Адрес хранится локально на устройстве. Существующий веб и сервер не изменяются.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .navigationTitle("Настройки прототипа")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Готово") { showSettings = false }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
            .task(id: apiBaseURL) {
                await model.loadCategories(base: apiBaseURL)
            }
            .task(id: requestKey) {
                await model.load(base: apiBaseURL, mode: mode, query: appliedQuery, categoryId: categoryId)
            }
            .refreshable {
                await model.load(base: apiBaseURL, mode: mode, query: appliedQuery, categoryId: categoryId)
            }
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(BarterPalette.orange.gradient)
                    .frame(width: 34, height: 38)
                Text("B")
                    .font(.system(size: 26, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
            }
            .accessibilityHidden(true)
            Text("БАРТЕР")
                .font(.system(size: 27, weight: .black, design: .rounded))
                .tracking(-1.2)
                .foregroundStyle(BarterPalette.foreground)
            Spacer()
            Button {
                showSettings = true
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 21, weight: .medium))
                    .foregroundStyle(BarterPalette.foreground)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Настройки подключения")
        }
        .padding(.horizontal, 17)
        .padding(.vertical, 6)
        .background(.regularMaterial)
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Поиск товаров, категорий, брендов", text: $query)
                .font(.system(size: 14))
                .submitLabel(.search)
                .onSubmit { appliedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines) }
                .accessibilityLabel("Поиск объявлений")
            if !query.isEmpty {
                Button {
                    query = ""
                    appliedQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                }
                .accessibilityLabel("Очистить поиск")
            }
            Rectangle().fill(.gray.opacity(0.25)).frame(width: 1, height: 22)
            Button { showSettings = true } label: {
                Image(systemName: "slider.horizontal.3")
                    .frame(width: 32, height: 40)
            }
            .accessibilityLabel("Настройки прототипа; фильтры пока недоступны")
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
        .background(BarterPalette.secondary, in: Capsule())
    }

    private var modeSelector: some View {
        HStack(spacing: 4) {
            ForEach(CatalogMode.allCases) { item in
                Button {
                    mode = item
                } label: {
                    Text(item.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(mode == item ? .white : BarterPalette.foreground)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background {
                            if mode == item {
                                Capsule().fill(BarterPalette.orange)
                            }
                        }
                }
                .accessibilityAddTraits(mode == item ? [.isSelected] : [])
            }
        }
        .padding(4)
        .background(BarterPalette.secondary, in: Capsule())
    }

    private var categoryStrip: some View {
        VStack(alignment: .leading, spacing: 7) {
            if !model.categories.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        categoryButton(name: "Все", id: nil)
                        ForEach(model.categories.filter { $0.parentId == nil }) { cat in
                            categoryButton(name: cat.title, id: cat.id)
                        }
                    }
                    .padding(.vertical, 3)
                }
            } else if let categoryError = model.categoryError, !apiBaseURL.isEmpty {
                Text(categoryError).font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func categoryButton(name: String, id: String?) -> some View {
        let selected = categoryId == id
        return Button {
            categoryId = id
        } label: {
            VStack(spacing: 8) {
                Circle()
                    .fill(selected ? BarterPalette.orange.opacity(0.16) : BarterPalette.secondary)
                    .frame(width: 62, height: 62)
                    .overlay {
                        Image(systemName: id == nil ? "square.grid.2x2.fill" : "shippingbox")
                            .font(.system(size: 23))
                            .foregroundStyle(selected ? BarterPalette.orange : .secondary)
                    }
                Text(name)
                    .font(.system(size: 11, weight: selected ? .bold : .medium))
                    .foregroundStyle(BarterPalette.foreground)
                    .lineLimit(1)
                    .frame(width: 72)
            }
        }
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Меняй. Покупай.\nОткрывай новое.")
                .font(.system(size: 25, weight: .heavy))
                .foregroundStyle(.white)
            Text("Нужные вещи. Новые возможности.")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.92))
        }
        .frame(maxWidth: .infinity, minHeight: 144, alignment: .leading)
        .padding(20)
        .background(
            LinearGradient(
                colors: [BarterPalette.orange, Color(red: 1, green: 0.62, blue: 0.33)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 22)
        )
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var feed: some View {
        if model.loading {
            ProgressView("Загружаем объявления")
                .frame(maxWidth: .infinity, minHeight: 170)
        } else if let error = model.error {
            VStack(spacing: 12) {
                Image(systemName: "wifi.exclamationmark")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text("Объявления временно недоступны").font(.headline)
                Text(error).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Button("Повторить") {
                    Task {
                        await model.load(base: apiBaseURL, mode: mode, query: appliedQuery, categoryId: categoryId)
                    }
                }
                .buttonStyle(.borderedProminent)
                Button("Настроить API") { showSettings = true }
                    .font(.footnote)
            }
            .frame(maxWidth: .infinity, minHeight: 210)
            .padding()
        } else if model.listings.isEmpty {
            ContentUnavailableView("Ничего не нашлось", systemImage: "magnifyingglass",
                                   description: Text("Попробуйте другую категорию или режим"))
                .frame(maxWidth: .infinity)
        } else {
            LazyVGrid(columns: [.init(.flexible(), spacing: 12), .init(.flexible(), spacing: 12)],
                      spacing: 20) {
                ForEach(model.listings) { listing in
                    ListingTile(listing: listing, apiBase: apiBaseURL)
                }
            }
        }
    }
}

private struct ListingTile: View {
    let listing: ListingDTO
    let apiBase: String

    private var photoURL: URL? {
        guard let api = try? CatalogAPI(rawBaseURL: apiBase) else { return nil }
        return api.imageURL(listing.images?.sorted(by: { $0.sortOrder < $1.sortOrder }).first?.url)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            ZStack {
                RoundedRectangle(cornerRadius: 15).fill(BarterPalette.secondary)
                AsyncImage(url: photoURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "photo")
                        .font(.title)
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(height: 164)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 15))
            Text(listing.title)
                .font(.system(size: 14, weight: .semibold))
                .lineLimit(2)
                .foregroundStyle(BarterPalette.foreground)
            Text(listing.priceRub.map { "\(Int($0).formatted()) ₽" } ?? "Цена не указана")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(BarterPalette.foreground)
            if listing.isBarter == true {
                Text("Обмен возможен")
                    .font(.caption2)
                    .foregroundStyle(BarterPalette.orange)
            }
            Text(listing.city)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    RootView()
}
