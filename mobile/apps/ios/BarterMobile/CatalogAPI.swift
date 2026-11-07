import Foundation

/// Mirrors only the public subset of apps/web/src/lib/api.ts.
/// The NestJS API remains authoritative; never synthesize production listings.
enum CatalogMode: String, CaseIterable, Identifiable {
    case market, barter, both
    var id: String { rawValue }
    var title: String {
        switch self {
        case .market: "Покупка"
        case .barter: "Обмен"
        case .both: "Все"
        }
    }
    var hint: String {
        switch self {
        case .market: "Объявления с возможностью покупки"
        case .barter: "Объявления продавцов, готовых к обмену"
        case .both: "Покупка и обмен в одной ленте"
        }
    }
}

struct CategoryDTO: Decodable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let parentId: String?
}

struct ListingImageDTO: Decodable {
    let id: String
    let url: String
    let sortOrder: Int
}

struct ListingCategoryDTO: Decodable {
    let id: String
    let title: String
}

struct ListingDTO: Decodable, Identifiable {
    let id: String
    let title: String
    let priceRub: Double?
    let city: String
    let isBarter: Bool?
    let saleEnabled: Bool?
    let images: [ListingImageDTO]?
    let category: ListingCategoryDTO
}

struct ListingFeedDTO: Decodable {
    let items: [ListingDTO]
    let total: Int
    let appliedMode: String?
}

enum CatalogError: LocalizedError {
    case configuration, invalidResponse, rejectedMode

    var errorDescription: String? {
        switch self {
        case .configuration: "Укажите HTTPS-адрес API в настройках прототипа."
        case .invalidResponse: "Сервер вернул некорректный ответ."
        case .rejectedMode: "Сервер не подтвердил выбранный режим каталога."
        }
    }
}

struct CatalogAPI {
    let baseURL: URL

    init(rawBaseURL: String) throws {
        guard let url = URL(string: rawBaseURL.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme == "https", url.host != nil,
              url.user == nil, url.password == nil,
              url.query == nil, url.fragment == nil
        else { throw CatalogError.configuration }
        self.baseURL = url
    }

    func categories() async throws -> [CategoryDTO] {
        try await request("categories", query: [])
    }

    func listings(mode: CatalogMode, query: String, categoryId: String?) async throws -> ListingFeedDTO {
        var fields: [URLQueryItem] = [
            .init(name: "mode", value: mode.rawValue),
            .init(name: "limit", value: "20"),
            .init(name: "sort", value: "relevant")
        ]
        if !query.isEmpty { fields.append(.init(name: "q", value: query)) }
        if let categoryId { fields.append(.init(name: "categoryId", value: categoryId)) }
        let feed: ListingFeedDTO = try await request("listings", query: fields)
        if mode == .barter {
            guard feed.appliedMode == "barter",
                  feed.items.allSatisfy({ $0.isBarter == true })
            else { throw CatalogError.rejectedMode }
        }
        if mode == .both && feed.appliedMode != "both" { throw CatalogError.rejectedMode }
        if mode == .market && feed.items.contains(where: { $0.saleEnabled == false }) {
            throw CatalogError.rejectedMode
        }
        return feed
    }

    func imageURL(_ raw: String?) -> URL? {
        guard let raw, !raw.isEmpty else { return nil }
        if let absolute = URL(string: raw), absolute.scheme == "https" { return absolute }
        guard !raw.contains("://"), !raw.hasPrefix("//") else { return nil }
        return URL(string: raw.hasPrefix("/") ? String(raw.dropFirst()) : raw, relativeTo: baseURL)?.absoluteURL
    }

    private func request<T: Decodable>(_ path: String, query: [URLQueryItem]) async throws -> T {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw CatalogError.configuration
        }
        let prefix = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components.path = "/" + ([prefix, path].filter { !$0.isEmpty }.joined(separator: "/"))
        components.queryItems = query.isEmpty ? nil : query
        guard let url = components.url else { throw CatalogError.configuration }
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw CatalogError.invalidResponse
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
