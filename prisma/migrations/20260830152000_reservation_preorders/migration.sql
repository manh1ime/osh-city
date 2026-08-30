CREATE TYPE "ReservationPreorderTiming" AS ENUM ('SERVE_ON_ARRIVAL', 'PREPARE_AFTER_SEATING');
CREATE TYPE "ReservationPreorderStatus" AS ENUM ('NEW', 'CONFIRMED', 'IN_KITCHEN', 'READY', 'CANCELED');

CREATE TABLE "ReservationPreorder" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "preorderNumber" TEXT NOT NULL,
  "status" "ReservationPreorderStatus" NOT NULL DEFAULT 'NEW',
  "timing" "ReservationPreorderTiming" NOT NULL,
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "guestComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "kitchenAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  CONSTRAINT "ReservationPreorder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReservationPreorderItem" (
  "id" TEXT NOT NULL,
  "preorderId" TEXT NOT NULL,
  "menuItemId" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "priceSnapshot" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "comment" TEXT,
  "totalPrice" INTEGER NOT NULL,
  CONSTRAINT "ReservationPreorderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationPreorder_preorderNumber_key" ON "ReservationPreorder"("preorderNumber");
CREATE INDEX "ReservationPreorder_restaurantId_status_createdAt_idx" ON "ReservationPreorder"("restaurantId", "status", "createdAt");
CREATE INDEX "ReservationPreorder_reservationId_createdAt_idx" ON "ReservationPreorder"("reservationId", "createdAt");
CREATE INDEX "ReservationPreorderItem_preorderId_idx" ON "ReservationPreorderItem"("preorderId");

ALTER TABLE "ReservationPreorder" ADD CONSTRAINT "ReservationPreorder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationPreorder" ADD CONSTRAINT "ReservationPreorder_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationPreorderItem" ADD CONSTRAINT "ReservationPreorderItem_preorderId_fkey" FOREIGN KEY ("preorderId") REFERENCES "ReservationPreorder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
