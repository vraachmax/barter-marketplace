//! Portable, UI-independent client-side primitives for Barter Mobile.
//!
//! The device does not own authoritative listings, accounts, or exchange
//! state transitions. Those remain exclusively in the NestJS backend.

/// User-facing listing intent. Server API contracts remain authoritative.
#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ListingIntent {
    Sell = 0,
    Exchange = 1,
    SellOrExchange = 2,
}

impl ListingIntent {
    pub const fn allows_exchange(self) -> bool {
        matches!(self, Self::Exchange | Self::SellOrExchange)
    }

    pub const fn allows_sale(self) -> bool {
        matches!(self, Self::Sell | Self::SellOrExchange)
    }
}

impl TryFrom<i32> for ListingIntent {
    type Error = ();
    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Sell),
            1 => Ok(Self::Exchange),
            2 => Ok(Self::SellOrExchange),
            _ => Err(()),
        }
    }
}

/// Stable C ABI boundary for future Swift/Kotlin bindings.
/// 1 means allowed, 0 means forbidden, -1 means invalid intent.
/// Do not interpret mode alone as proof a server response has been filtered.
#[no_mangle]
pub extern "C" fn barter_mode_allows_exchange(mode: i32) -> i32 {
    match ListingIntent::try_from(mode) {
        Ok(mode) => i32::from(mode.allows_exchange()),
        Err(()) => -1,
    }
}

#[no_mangle]
pub extern "C" fn barter_mode_allows_sale(mode: i32) -> i32 {
    match ListingIntent::try_from(mode) {
        Ok(mode) => i32::from(mode.allows_sale()),
        Err(()) => -1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn intents_have_expected_capabilities() {
        assert!(ListingIntent::Sell.allows_sale());
        assert!(!ListingIntent::Sell.allows_exchange());
        assert!(ListingIntent::Exchange.allows_exchange());
        assert!(!ListingIntent::Exchange.allows_sale());
        assert!(ListingIntent::SellOrExchange.allows_sale());
        assert!(ListingIntent::SellOrExchange.allows_exchange());
    }

    #[test]
    fn ffi_rejects_invalid_modes() {
        assert_eq!(barter_mode_allows_sale(-1), -1);
        assert_eq!(barter_mode_allows_exchange(42), -1);
        assert_eq!(barter_mode_allows_sale(0), 1);
        assert_eq!(barter_mode_allows_exchange(0), 0);
        assert_eq!(barter_mode_allows_exchange(1), 1);
        assert_eq!(barter_mode_allows_sale(1), 0);
        assert_eq!(barter_mode_allows_exchange(2), 1);
        assert_eq!(barter_mode_allows_sale(2), 1);
    }
}

// Android JNI bridge (package app.barter.mobile, Kotlin object RustBridge).
// JNI's first two opaque pointers are JNIEnv and jclass; we do not dereference them.
// Keep native method names and package in sync with Android/RustBridge.kt.
#[cfg(target_os = "android")]
#[no_mangle]
pub extern "system" fn Java_app_barter_mobile_RustBridge_nativeAllowsSale(
    _env: *mut core::ffi::c_void,
    _class: *mut core::ffi::c_void,
    mode: i32,
) -> i32 {
    barter_mode_allows_sale(mode)
}

#[cfg(target_os = "android")]
#[no_mangle]
pub extern "system" fn Java_app_barter_mobile_RustBridge_nativeAllowsExchange(
    _env: *mut core::ffi::c_void,
    _class: *mut core::ffi::c_void,
    mode: i32,
) -> i32 {
    barter_mode_allows_exchange(mode)
}
