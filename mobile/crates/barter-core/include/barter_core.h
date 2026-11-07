#ifndef BARTER_CORE_H
#define BARTER_CORE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// 0 = Sell, 1 = Exchange, 2 = SellOrExchange.
// Return 1 = allowed, 0 = not allowed, -1 = invalid mode.
int32_t barter_mode_allows_sale(int32_t mode);
int32_t barter_mode_allows_exchange(int32_t mode);

#ifdef __cplusplus
}
#endif
#endif
