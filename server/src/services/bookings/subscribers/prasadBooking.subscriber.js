import {
  paymentEvents,
  PAYMENT_EVENTS,
} from "../../payments/events/payment.events.js";
import logger from "../../../utils/logger.js";
import { PrasadBooking } from "../models/prasadBooking.model.js";
import { sendPrasadReceiptService } from "../services/prasadReceipt.services.js";

// Only react to payments that belong to a prasad booking. Other purposes
// (donations, etc.) flow past untouched.
const isPrasadBooking = (payment) =>
  payment?.reference?.model === "PrasadBooking";

// Backup path: when Razorpay's webhook settles a payment (e.g. the user paid but
// closed the tab before /verify ran), confirm the booking here too. The
// interactive /verify route also confirms synchronously — both are idempotent.
paymentEvents.on(PAYMENT_EVENTS.SUCCEEDED, async ({ payment }) => {
  if (!isPrasadBooking(payment)) return;
  try {
    await PrasadBooking.findByIdAndUpdate(payment.reference.id, {
      status: "confirmed",
    });
    // Idempotent: sends the receipt + invoice once, even if /verify already did.
    await sendPrasadReceiptService(payment.reference.id);
  } catch (error) {
    logger.error({ err: error }, "Failed to confirm prasad booking");
  }
});

paymentEvents.on(PAYMENT_EVENTS.FAILED, async ({ payment }) => {
  if (!isPrasadBooking(payment)) return;
  try {
    await PrasadBooking.findByIdAndUpdate(payment.reference.id, {
      status: "failed",
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to mark prasad booking failed");
  }
});
