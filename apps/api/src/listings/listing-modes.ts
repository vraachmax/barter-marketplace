import { BadRequestException } from '@nestjs/common';

type ModeInput = {
  saleEnabled?: boolean;
  barterEnabled?: boolean;
  attributes?: Record<string, unknown> | null;
};

/** Explicit fields are canonical; attributes.isBarter supports older clients. */
export function resolveListingModes(input: ModeInput, current: ModeInput | undefined, barterAllowed: boolean) {
  const legacy = input.attributes?.isBarter;
  if (input.barterEnabled !== undefined && typeof legacy === 'boolean' && legacy !== input.barterEnabled) {
    throw new BadRequestException('listing_mode_conflict');
  }
  const saleEnabled = input.saleEnabled ?? current?.saleEnabled ?? true;
  let barterEnabled = input.barterEnabled ?? (typeof legacy === 'boolean' ? legacy :
    current?.barterEnabled ?? (current?.attributes?.isBarter === true));
  if (!barterAllowed) {
    if (input.barterEnabled === true || legacy === true) {
      throw new BadRequestException('barter_not_available_for_category');
    }
    barterEnabled = false;
  }
  if (!saleEnabled && !barterEnabled) throw new BadRequestException('listing_mode_required');
  return { saleEnabled, barterEnabled };
}
