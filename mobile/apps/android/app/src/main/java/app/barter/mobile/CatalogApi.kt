package app.barter.mobile

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.net.URLEncoder

enum class CatalogMode(val wire: String, val rustValue: Int, val title: String) {
    MARKET("market", 0, "Покупка"),
    BARTER("barter", 1, "Обмен"),
    BOTH("both", 2, "Все")
}

data class CatalogCategory(val id: String, val title: String, val parentId: String?)
data class ListingCard(
    val id: String,
    val title: String,
    val priceRub: Double?,
    val city: String,
    val category: String,
    val imageUrl: String?,
    val isBarter: Boolean
)

class CatalogApi(base: String) {
    private val origin: URI = URI(base.trim()).also { uri ->
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() &&
                uri.userInfo == null && uri.rawQuery == null && uri.rawFragment == null) {
            "Укажите корректный HTTPS-адрес API"
        }
    }
    private val root = origin.toString().trimEnd('/')

    private fun apiUrl(path: String, params: Map<String, String> = emptyMap()): URL {
        val query = params.entries.joinToString("&") {
            "${URLEncoder.encode(it.key, "UTF-8")}=${URLEncoder.encode(it.value, "UTF-8")}"
        }
        return URL("$root/$path${if (query.isNotEmpty()) "?$query" else ""}")
    }

    private fun resolveImage(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("https://")) return path
        if (path.contains("://") || path.startsWith("//")) return null
        return "$root/${path.trimStart('/')}"
    }

    private suspend fun fetch(path: String, params: Map<String, String> = emptyMap()): String =
        withContext(Dispatchers.IO) {
            val connection = (apiUrl(path, params).openConnection() as HttpURLConnection).apply {
                connectTimeout = 8_000
                readTimeout = 8_000
                requestMethod = "GET"
                setRequestProperty("Accept", "application/json")
                instanceFollowRedirects = false
            }
            try {
                if (connection.responseCode !in 200..299) {
                    throw IllegalStateException("Сервер вернул HTTP ${connection.responseCode}")
                }
                connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            } finally {
                connection.disconnect()
            }
        }

    suspend fun categories(): List<CatalogCategory> {
        val body = JSONArray(fetch("categories"))
        return (0 until body.length()).map { index ->
            val obj = body.getJSONObject(index)
            CatalogCategory(obj.getString("id"), obj.getString("title"),
                obj.optString("parentId").takeUnless { it.isBlank() || it == "null" })
        }
    }

    suspend fun listings(mode: CatalogMode, query: String, categoryId: String?): List<ListingCard> {
        val params = mutableMapOf("mode" to mode.wire, "limit" to "20", "sort" to "relevant")
        if (query.isNotBlank()) params["q"] = query.trim()
        if (!categoryId.isNullOrBlank()) params["categoryId"] = categoryId
        val body = JSONObject(fetch("listings", params))
        val rows = body.getJSONArray("items")
        if (mode != CatalogMode.MARKET && body.optString("appliedMode") != mode.wire) {
            error("Сервер не подтвердил режим каталога")
        }
        val items = (0 until rows.length()).map { i ->
            val item = rows.getJSONObject(i)
            val images = item.optJSONArray("images")
            val photo = (0 until (images?.length() ?: 0))
                .map { images!!.getJSONObject(it) }
                .minByOrNull { it.optInt("sortOrder", 0) }
                ?.optString("url")
            ListingCard(
                id = item.getString("id"),
                title = item.getString("title"),
                priceRub = if (item.isNull("priceRub")) null else item.optDouble("priceRub").takeUnless { it.isNaN() },
                city = item.optString("city"),
                category = item.optJSONObject("category")?.optString("title").orEmpty(),
                imageUrl = resolveImage(photo),
                isBarter = item.optBoolean("isBarter", false)
            )
        }
        if (mode == CatalogMode.BARTER && items.any { !it.isBarter }) {
            error("Сервер вернул объявления без обмена")
        }
        if (mode == CatalogMode.MARKET && (0 until rows.length()).any { i ->
                rows.getJSONObject(i).opt("saleEnabled") == false
            }) {
            error("Сервер вернул объявления без возможности покупки")
        }
        return items
    }
}
