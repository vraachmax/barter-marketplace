//! Portable, UI-independent client-side primitives for Barter Mobile.
//!
//! This crate intentionally contains no backend authority, network transport,
//! platform bindings, or production domain assumptions.

/// The user-facing listing intent. Server API contracts remain authoritative.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ListingIntent {
    Sell,
    Exchange,
    SellOrExchange,
}

impl ListingIntent {
    /// Whether this intent allows an exchange proposal.
    pub const fn allows_exchange(self) -> bool {
        matches!(self, Self::Exchange | Self::SellOrExchange)
    }

    /// Whether this intent permits a direct sale.
    pub const fn allows_sale(self) -> bool {
        matches!(self, Self::Sell | Self::SellOrExchange)
    }
}

#[cfg(test)]
mod tests {
    use super::ListingIntent;

    #[test]
    fn intents_have_expected_capabilities() {
        assert!(ListingIntent::Sell.allows_sale());
        assert!(!ListingIntent::Sell.allows_exchange());
        assert!(ListingIntent::Exchange.allows_exchange());
        assert!(!ListingIntent::Exchange.allows_sale());
        assert!(ListingIntent::SellOrExchange.allows_sale());
        assert!(ListingIntent::SellOrExchange.allows_exchange());
    }
}
