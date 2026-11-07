import Foundation
import BarterCore

/// The UI now calls compiled Rust through the stable C ABI.
/// The enum numbering is documented in barter_core.h; do not reorder.
enum RustCapabilities {
    static func supportsSale(_ mode: CatalogMode) -> Bool {
        barter_mode_allows_sale(mode.ffiValue) == 1
    }

    static func supportsExchange(_ mode: CatalogMode) -> Bool {
        barter_mode_allows_exchange(mode.ffiValue) == 1
    }

    static func explanation(_ mode: CatalogMode) -> String {
        switch (supportsSale(mode), supportsExchange(mode)) {
        case (true, true): "Покупка и обмен в одной ленте"
        case (true, false): "Объявления с возможностью покупки"
        case (false, true): "Объявления продавцов, готовых к обмену"
        default: "Режим временно недоступен"
        }
    }
}

private extension CatalogMode {
    var ffiValue: Int32 {
        switch self {
        case .market: 0
        case .barter: 1
        case .both: 2
        }
    }
}
