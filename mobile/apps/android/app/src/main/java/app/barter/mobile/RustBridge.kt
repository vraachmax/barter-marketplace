package app.barter.mobile

/** JNI exports from mobile/crates/barter-core/src/lib.rs.
 * Invalid modes are rejected by Rust with -1.
 */
object RustBridge {
    init { System.loadLibrary("barter_core") }

    private external fun nativeAllowsSale(mode: Int): Int
    private external fun nativeAllowsExchange(mode: Int): Int

    fun allowsSale(mode: CatalogMode): Boolean = nativeAllowsSale(mode.rustValue) == 1
    fun allowsExchange(mode: CatalogMode): Boolean = nativeAllowsExchange(mode.rustValue) == 1

    fun explanation(mode: CatalogMode): String = when {
        allowsSale(mode) && allowsExchange(mode) -> "Покупка и обмен в одной ленте"
        allowsSale(mode) -> "Объявления с возможностью покупки"
        allowsExchange(mode) -> "Объявления продавцов, готовых к обмену"
        else -> "Недоступный режим"
    }
}
