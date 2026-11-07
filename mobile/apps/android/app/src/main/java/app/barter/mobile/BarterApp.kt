package app.barter.mobile

import android.content.Context
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import java.text.NumberFormat
import java.util.Locale

private val tabs = listOf("Главная", "Избранное", "Разместить", "Сообщения", "Профиль")
private val icons = listOf(Icons.Default.Home, Icons.Default.FavoriteBorder, Icons.Default.AddCircleOutline, Icons.Default.ChatBubbleOutline, Icons.Default.PersonOutline)

@Composable
fun BarterApp(model: HomeViewModel = viewModel()) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("barter_mobile_prototype", Context.MODE_PRIVATE) }
    var apiBase by rememberSaveable { mutableStateOf(prefs.getString("api_url", "").orEmpty()) }
    var draftBase by remember { mutableStateOf(apiBase) }
    var showSettings by remember { mutableStateOf(false) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var mode by rememberSaveable { mutableStateOf(CatalogMode.MARKET) }
    var search by rememberSaveable { mutableStateOf("") }
    var appliedSearch by rememberSaveable { mutableStateOf("") }
    var categoryId by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(apiBase) { model.loadCategories(apiBase) }
    LaunchedEffect(apiBase, mode, appliedSearch, categoryId) {
        model.load(apiBase, mode, appliedSearch, categoryId)
    }

    if (showSettings) {
        AlertDialog(
            onDismissRequest = { showSettings = false },
            title = { Text("Подключение API") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = draftBase,
                        onValueChange = { draftBase = it },
                        singleLine = true,
                        label = { Text("HTTPS-адрес NestJS API") },
                        placeholder = { Text("https://api.example.com") },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done)
                    )
                    Text("Только публичный HTTPS-адрес. Не вводите токены и пароли.", style = MaterialTheme.typography.bodySmall)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    apiBase = draftBase.trim()
                    prefs.edit().putString("api_url", apiBase).apply()
                    showSettings = false
                }) { Text("Сохранить") }
            },
            dismissButton = { TextButton(onClick = { showSettings = false }) { Text("Отмена") } }
        )
    }

    Scaffold(
        containerColor = Color.White,
        bottomBar = {
            NavigationBar(containerColor = Color.White, tonalElevation = 4.dp) {
                tabs.forEachIndexed { index, name ->
                    NavigationBarItem(
                        selected = tab == index,
                        onClick = { tab = index },
                        icon = { Icon(icons[index], contentDescription = null) },
                        label = { Text(name, fontSize = 10.sp, maxLines = 1) },
                        alwaysShowLabel = true
                    )
                }
            }
        }
    ) { padding ->
        if (tab != 0) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(icons[tab], null, tint = BarterOrange, modifier = Modifier.size(44.dp))
                Spacer(Modifier.height(14.dp))
                Text(tabs[tab], style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text("Раздел появится после подключения авторизации и переноса сценариев.",
                    textAlign = TextAlign.Center, color = Color.Gray)
            }
        } else {
            Column(modifier = Modifier.fillMaxSize().padding(padding)) {
                Row(
                    modifier = Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BubbleBLogo(Modifier.width(33.dp).height(37.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("БАРТЕР", fontSize = 27.sp, fontWeight = FontWeight.Black, color = BarterInk)
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = { draftBase = apiBase; showSettings = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Настройки подключения")
                    }
                }
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        OutlinedTextField(
                            value = search,
                            onValueChange = { search = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Поиск товаров, категорий, брендов", fontSize = 13.sp, maxLines = 1) },
                            leadingIcon = { Icon(Icons.Default.Search, null) },
                            trailingIcon = {
                                IconButton(onClick = { draftBase = apiBase; showSettings = true }) {
                                    Icon(Icons.Default.Tune, contentDescription = "Настройки прототипа; фильтры ещё не реализованы")
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(28.dp),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { appliedSearch = search.trim() })
                        )
                    }
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(30.dp)).background(BarterSurface).padding(4.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            CatalogMode.entries.forEach { item ->
                                val selected = mode == item
                                Box(
                                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(25.dp))
                                        .background(if (selected) BarterOrange else Color.Transparent)
                                        .clickable { mode = item }.padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(item.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                                        color = if (selected) Color.White else BarterInk)
                                }
                            }
                        }
                    }
                    item {
                        Text(RustBridge.explanation(mode), modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center, fontSize = 12.sp, color = Color.Gray)
                    }
                    if (model.state.categories.isNotEmpty()) {
                        item {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                item { CategoryBadge("Все", categoryId == null) { categoryId = null } }
                                items(model.state.categories.filter { it.parentId == null }, key = { it.id }) { cat ->
                                    CategoryBadge(cat.title, categoryId == cat.id) { categoryId = cat.id }
                                }
                            }
                        }
                    }
                    if (appliedSearch.isBlank() && categoryId == null) {
                        item {
                            Column(
                                modifier = Modifier.fillMaxWidth()
                                    .clip(RoundedCornerShape(22.dp))
                                    .background(Brush.linearGradient(listOf(BarterOrange, Color(0xFFFFA356))))
                                    .padding(22.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text("Меняй. Покупай.\nОткрывай новое.", fontSize = 25.sp, lineHeight = 30.sp,
                                    fontWeight = FontWeight.ExtraBold, color = Color.White)
                                Text("Нужные вещи. Новые возможности.", color = Color.White, fontSize = 13.sp)
                            }
                        }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(if (appliedSearch.isEmpty()) "Для вас" else "Результаты поиска",
                                fontSize = 22.sp, fontWeight = FontWeight.Bold, color = BarterInk)
                            Spacer(Modifier.weight(1f))
                            if (appliedSearch.isNotEmpty()) {
                                TextButton(onClick = { appliedSearch = ""; search = "" }) { Text("Сбросить") }
                            }
                        }
                    }
                    when {
                        model.state.loading -> item {
                            Box(Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = BarterOrange)
                            }
                        }
                        model.state.error != null -> item {
                            Column(
                                Modifier.fillMaxWidth().padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text("Объявления временно недоступны", fontWeight = FontWeight.Bold)
                                Text(model.state.error.orEmpty(), fontSize = 13.sp, color = Color.Gray, textAlign = TextAlign.Center)
                                Button(onClick = { model.load(apiBase, mode, appliedSearch, categoryId) }) { Text("Повторить") }
                                TextButton(onClick = { draftBase = apiBase; showSettings = true }) { Text("Настроить API") }
                            }
                        }
                        model.state.listings.isEmpty() -> item {
                            Text("Ничего не нашлось. Попробуйте изменить запрос или категорию.",
                                modifier = Modifier.fillMaxWidth().padding(24.dp),
                                color = Color.Gray, textAlign = TextAlign.Center)
                        }
                        else -> {
                            val rows = model.state.listings.chunked(2)
                            items(rows.size) { rowIndex ->
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    rows[rowIndex].forEach { listing ->
                                        ListingTile(listing, Modifier.weight(1f))
                                    }
                                    if (rows[rowIndex].size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryBadge(name: String, selected: Boolean, onClick: () -> Unit) {
    Column(
        Modifier.width(76.dp).clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Box(
            modifier = Modifier.size(62.dp).clip(CircleShape)
                .background(if (selected) Color(0xFFFFE5D7) else BarterSurface),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Category, null, tint = if (selected) BarterOrange else Color.Gray)
        }
        Text(name, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, color = BarterInk)
    }
}

@Composable
private fun ListingTile(listing: ListingCard, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(5.dp)) {
        AsyncImage(
            model = listing.imageUrl,
            contentDescription = listing.title,
            modifier = Modifier.fillMaxWidth().height(168.dp).clip(RoundedCornerShape(14.dp))
                .background(BarterSurface),
            contentScale = ContentScale.Crop
        )
        Text(listing.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = BarterInk,
            maxLines = 2, overflow = TextOverflow.Ellipsis)
        val price = listing.priceRub?.let {
            NumberFormat.getNumberInstance(Locale.forLanguageTag("ru-RU")).format(it) + " ₽"
        } ?: "Цена не указана"
        Text(price, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BarterInk)
        if (listing.isBarter) Text("Обмен возможен", fontSize = 11.sp, color = BarterOrange)
        Text(listing.city, fontSize = 12.sp, color = Color.Gray, maxLines = 1)
    }
}

/** Geometry reproduced from the existing approved apps/web/public/brand/bubble-b-v3.svg.
 *  Unlike a placeholder text B, this renders the actual double-contour silhouette.
 */
@Composable
private fun BubbleBLogo(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val outer = listOf(
            6.6f to 2.5f, 2f to 7.3f, 0f to 13.2f, 0f to 61.3f, 2.8f to 72.7f,
            7.8f to 82f, 12.7f to 87.6f, 20.3f to 93.4f, 28.1f to 97.2f,
            35.9f to 99.2f, 47.1f to 99.7f, 54.2f to 98.7f, 63.3f to 95.7f,
            71.1f to 91.1f, 79.2f to 83.8f, 83.5f to 78f, 87.3f to 70.1f,
            89.1f to 63.5f, 89.6f to 51.4f, 88.9f to 46.6f, 86.1f to 38f,
            82f to 30.9f, 73.4f to 22.8f, 62.3f to 18f, 55.7f to 17f,
            27.3f to 17f, 27.6f to 3f, 25.3f to 0.3f, 11.9f to 0.3f
        )
        val inner = listOf(
            26.6f to 36.2f, 29.4f to 39.2f, 34.2f to 41.5f, 44.3f to 39f,
            51.9f to 40f, 57.2f to 42.8f, 60.5f to 46.1f, 63.3f to 51.4f,
            64.1f to 58f, 61.8f to 65.6f, 57.5f to 70.9f, 53.4f to 73.7f,
            49.4f to 75.2f, 42.5f to 75.7f, 37.5f to 74.4f, 31.1f to 70.1f,
            28.6f to 66.8f, 26.1f to 60f
        )
        val path = Path().apply {
            fun outline(points: List<Pair<Float, Float>>) {
                points.forEachIndexed { index, (x, y) ->
                    if (index == 0) moveTo(x * size.width / 96f, y * size.height / 105f)
                    else lineTo(x * size.width / 96f, y * size.height / 105f)
                }
                close()
            }
            outline(outer)
            outline(inner)
            fillType = androidx.compose.ui.graphics.PathFillType.EvenOdd
        }
        drawPath(
            path, brush = Brush.linearGradient(
                listOf(Color(0xFFFF610A), Color(0xFFFF9609), Color(0xFFFF4700))
            )
        )
    }
}
