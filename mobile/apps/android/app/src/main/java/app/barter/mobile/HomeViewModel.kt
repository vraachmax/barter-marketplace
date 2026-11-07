package app.barter.mobile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

data class HomeState(
    val loading: Boolean = false,
    val listings: List<ListingCard> = emptyList(),
    val categories: List<CatalogCategory> = emptyList(),
    val error: String? = null,
    val categoriesError: String? = null
)

class HomeViewModel : ViewModel() {
    var state by androidx.compose.runtime.mutableStateOf(HomeState())
        private set
    private var feedJob: Job? = null
    private var categoryJob: Job? = null

    fun load(base: String, mode: CatalogMode, query: String, categoryId: String?) {
        feedJob?.cancel()
        state = state.copy(loading = true, error = null, listings = emptyList())
        feedJob = viewModelScope.launch {
            try {
                val listings = CatalogApi(base).listings(mode, query, categoryId)
                state = state.copy(listings = listings, loading = false)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                state = state.copy(error = e.message ?: "Не удалось загрузить объявления", loading = false)
            }
        }
    }

    fun loadCategories(base: String) {
        categoryJob?.cancel()
        state = state.copy(categories = emptyList(), categoriesError = null)
        categoryJob = viewModelScope.launch {
            try {
                state = state.copy(categories = CatalogApi(base).categories())
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                state = state.copy(categoriesError = e.message ?: "Категории недоступны")
            }
        }
    }
}
