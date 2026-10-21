// @vitest-environment node
// The hold switch: real payments wait for the owner's OK unless SEND_ORDERS_AUTOMATICALLY is exactly "yes".
import { describe, it, expect } from 'vitest'
import { autoSendIsOn, AUTO_SEND_SETTING, HELD_NOTE } from '../lib/orderSending'

describe('automatic sending', () => {
  it('is OFF unless the setting is exactly "yes" (the safe default: a mistake can only ever hold an order, never send one)', () => {
    expect(AUTO_SEND_SETTING).toBe('SEND_ORDERS_AUTOMATICALLY')
    expect(autoSendIsOn({})).toBe(false)
    for (const value of [undefined, null, '', ' ', 'no', 'true', '1', 'on', 'yes please', 'y', 'ye', 'yess', 'false']) expect(autoSendIsOn({ SEND_ORDERS_AUTOMATICALLY: value }), String(value)).toBe(false)
  })
  it('is ON for "yes", however it is capitalised or spaced', () => {
    for (const value of ['yes', 'YES', 'Yes', ' yes ', 'yes\n']) expect(autoSendIsOn({ SEND_ORDERS_AUTOMATICALLY: value }), JSON.stringify(value)).toBe(true)
  })
  it('reads the real settings when none are given', () => {
    const before = process.env.SEND_ORDERS_AUTOMATICALLY
    delete process.env.SEND_ORDERS_AUTOMATICALLY; expect(autoSendIsOn()).toBe(false)
    process.env.SEND_ORDERS_AUTOMATICALLY = 'yes'; expect(autoSendIsOn()).toBe(true)
    if (before === undefined) delete process.env.SEND_ORDERS_AUTOMATICALLY; else process.env.SEND_ORDERS_AUTOMATICALLY = before
  })
  it('explains in plain words, on the order, why it is held and what to do', () => {
    expect(HELD_NOTE).toMatch(/Held: automatic sending is switched off/); expect(HELD_NOTE).toMatch(/Send to Creative Hub/); expect(HELD_NOTE).toMatch(/cancel and refund/)
  })
})
