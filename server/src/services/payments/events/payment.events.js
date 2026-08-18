import { EventEmitter } from "node:events";

export const PAYMENT_EVENTS = {
  SUCCEEDED: "payment:succeeded",
  FAILED: "payment:failed",
  REFUNDED: "payment:refunded",
};

// In-process pub/sub that lets domain modules (booking, donation, …) react to
// payment lifecycle changes WITHOUT the payments module importing them.
//
// Dependency direction stays one-way: a domain module calls createOrderService
// (it depends on payments) and subscribes to these events; payments never
// depends on any domain module. Each listener receives the settled Payment
// document and decides — via `payment.purpose` / `payment.reference` — whether
// the event concerns it.
class PaymentEventBus extends EventEmitter {}

export const paymentEvents = new PaymentEventBus();
