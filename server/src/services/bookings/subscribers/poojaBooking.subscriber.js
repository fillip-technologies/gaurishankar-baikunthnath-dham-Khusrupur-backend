import {
  paymentEvents,
  PAYMENT_EVENTS,
} from "../../payments/events/payment.events.js";
import logger from "../../../utils/logger.js";
import { PoojaBooking } from "../models/poojaBooking.model.js";
import { sendPoojaReceiptService } from "../services/bookingReceipt.service.js";

const isPoojaBooking = (payment) =>
  payment?.reference?.model === "PoojaBooking";

// Backup path: when Razorpay's webhook settles a payment (e.g. the user paid but
// closed the tab before /verify ran), confirm the booking here too. The
// interactive /verify route also confirms synchronously — both are idempotent.
paymentEvents.on(PAYMENT_EVENTS.SUCCEEDED, async ({ payment }) => {
  if (!isPoojaBooking(payment)) return;
  try {
    await PoojaBooking.findByIdAndUpdate(payment.reference.id, {
      status: "confirmed",
    });
    // Idempotent: sends the receipt + invoice once, even if /verify already did.
    await sendPoojaReceiptService(payment.reference.id);
  } catch (error) {
    logger.error({ err: error }, "Failed to confirm pooja booking");
  }
});

paymentEvents.on(PAYMENT_EVENTS.FAILED, async ({ payment }) => {
  if (!isPoojaBooking(payment)) return;
  try {
    await PoojaBooking.findByIdAndUpdate(payment.reference.id, {
      status: "failed",
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to mark pooja booking failed");
  }
});
