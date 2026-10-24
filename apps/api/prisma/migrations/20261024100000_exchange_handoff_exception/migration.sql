-- An exceptional handoff must be explicitly requested by the proposer
-- and explicitly acknowledged by the recipient before acceptance.
ALTER TABLE "ExchangeOffer" ADD COLUMN "handoffException" BOOLEAN NOT NULL DEFAULT false;