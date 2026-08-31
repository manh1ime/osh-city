import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTimeSlots,
  combineDateAndTime,
  isTimeWithinWorkingHours,
} from "../src/lib/reservations";
import {
  createOrderSchema,
  normalizeRussianPhone,
  reservationSchema,
} from "../src/lib/validation";

test("allows only valid reservation status transitions", () => {
  const transitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "SEATED", "CANCELED", "NO_SHOW"],
    CONFIRMED: ["SEATED", "CANCELED", "NO_SHOW"],
    SEATED: ["NO_SHOW"],
    CANCELED: [],
    NO_SHOW: [],
  };
  assert.equal(transitions.PENDING.includes("CONFIRMED"), true);
  assert.equal(transitions.PENDING.includes("SEATED"), true);
  assert.equal(transitions.CANCELED.includes("CONFIRMED"), false);
});

test("normalizes a Russian phone with visual separators", () => {
  const result = reservationSchema.safeParse({
    branchSlug: "sadovaya",
    name: "Иван",
    phone: "+7 (999) 000-99-00",
    date: "2030-01-02",
    time: "19:00",
    guests: "2",
    comment: "",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.phone, "+79990009900");
  assert.equal(normalizeRussianPhone("8 (999) 000-99-00"), "+89990009900");
});

test("rejects non +7 phones and wrong digit counts", () => {
  const base = {
    branchSlug: "sadovaya",
    name: "Иван",
    date: "2030-01-02",
    time: "19:00",
    guests: 2,
  };
  assert.equal(reservationSchema.safeParse({ ...base, phone: "8 999 000-99-00" }).success, false);
  assert.equal(reservationSchema.safeParse({ ...base, phone: "+7 999 000-99-0" }).success, false);
});

test("enforces server-side order comment limits", () => {
  const input = {
    tableToken: "tbl_1_abcdefgh",
    comment: "x".repeat(301),
    items: [{ menuItemId: "clxxxxxxxxxxxx", quantity: 1 }],
  };
  assert.equal(createOrderSchema.safeParse(input).success, false);
});

test("rejects invalid calendar dates and invalid clock values", () => {
  assert.equal(combineDateAndTime("2030-02-30", "12:00"), null);
  assert.equal(combineDateAndTime("2030-01-01", "24:00"), null);
  assert.ok(combineDateAndTime("2030-01-01", "12:00"));
});

test("handles working hours that cross midnight", () => {
  assert.equal(isTimeWithinWorkingHours("22:00", "22:00", "02:00"), true);
  assert.equal(isTimeWithinWorkingHours("01:00", "22:00", "02:00"), true);
  assert.equal(isTimeWithinWorkingHours("01:30", "22:00", "02:00"), false);
  assert.equal(isTimeWithinWorkingHours("02:30", "22:00", "02:00"), false);
  assert.equal(isTimeWithinWorkingHours("21:59", "22:00", "02:00"), false);
});

test("does not offer a reservation slot at closing and supports midnight", () => {
  assert.deepEqual(buildTimeSlots("10:00", "12:00"), ["10:00", "10:30", "11:00"]);
  assert.deepEqual(buildTimeSlots("22:00", "02:00"), ["22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00"]);
});
