import { hhaexchangeAdapter } from './hhaexchange-adapter'
import { sandataAdapter } from './sandata-adapter'
import type { AggregatorAdapter, AggregatorVendor } from './types'

const ADAPTERS: Partial<Record<AggregatorVendor, AggregatorAdapter>> = {
  hhaexchange: hhaexchangeAdapter,
  sandata: sandataAdapter,
}

export function getAdapter(vendor: AggregatorVendor): AggregatorAdapter | null {
  return ADAPTERS[vendor] ?? null
}
