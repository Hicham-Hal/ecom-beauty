import Setting from '../models/Setting.model.js'

// The 69 wilaya codes: "01" ... "69"
export const WILAYA_CODES = Array.from({ length: 69 }, (_, i) => String(i + 1).padStart(2, '0'))

// Delivery prices saved by the seller: { "05": { home: 900, stopdesk: 500 }, ... }
// There is NO built-in table: until the seller saves real prices this is {} and orders
// to a wilaya without a price are refused.
export const loadDeliveryPrices = async () => {
    const setting = await Setting.findOne({ key: 'deliveryPrices' })
    return setting?.value && typeof setting.value === 'object' ? setting.value : {}
}