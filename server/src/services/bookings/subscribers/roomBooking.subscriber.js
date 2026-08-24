import {
  paymentEvents,
  PAYMENT_EVENTS,
} from "../../payments/events/payment.events.js";
import logger from "../../../utils/logger.js";
import { RoomBooking } from "../models/roomBooking.model.js";
import { sendRoomReceiptService } from "../services/bookingReceipt.service.js";

const isRoomBooking = (payment) => payment?.reference?.model === "RoomBooking";

// Backup path: when Razorpay's webhook settles a payment (e.g. the user paid but
// closed the tab before /verify ran), confirm the booking here too. The
// interactive /verify route also confirms synchronously — both are idempotent.
paymentEvents.on(PAYMENT_EVENTS.SUCCEEDED, async ({ payment }) => {
  if (!isRoomBooking(payment)) return;
  try {
    await RoomBooking.findByIdAndUpdate(payment.reference.id, {
      status: "confirmed",
    });
    // Idempotent: sends the receipt + invoice once, even if /verify already did.
    await sendRoomReceiptService(payment.reference.id);
  } catch (error) {
    logger.error({ err: error }, "Failed to confirm room booking");
  }
});

paymentEvents.on(PAYMENT_EVENTS.FAILED, async ({ payment }) => {
  if (!isRoomBooking(payment)) return;
  try {
    await RoomBooking.findByIdAndUpdate(payment.reference.id, {
      status: "failed",
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to mark room booking failed");
  }
});
