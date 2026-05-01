"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useBooking } from "@/hooks/useBooking";
import { BookingFormData } from "@/types";

export default function BookingForm({ type = "room" }: { type?: "room" | "tour" }) {
  const { loading, error, success, createBooking } = useBooking();
  const [formData, setFormData] = useState<BookingFormData>({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    numberOfGuests: 1,
    specialRequests: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBooking(formData);
      // Reset form or redirect to confirmation
    } catch (err) {
      console.error("Form submission failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-luxury-gold mb-6">
        Book Your {type === "room" ? "Stay" : "Tour"}
      </h2>

      <Input
        label="Full Name"
        name="guestName"
        value={formData.guestName}
        onChange={handleChange}
        required
      />

      <Input
        label="Email"
        type="email"
        name="guestEmail"
        value={formData.guestEmail}
        onChange={handleChange}
        required
      />

      <Input
        label="Phone"
        type="tel"
        name="guestPhone"
        value={formData.guestPhone}
        onChange={handleChange}
        required
      />

      <Input
        label="Number of Guests"
        type="number"
        name="numberOfGuests"
        value={formData.numberOfGuests}
        onChange={handleChange}
        min="1"
        required
      />

      {type === "room" && (
        <>
          <Input
            label="Check-in Date"
            type="date"
            name="checkInDate"
            onChange={handleChange}
          />
          <Input
            label="Check-out Date"
            type="date"
            name="checkOutDate"
            onChange={handleChange}
          />
        </>
      )}

      <div>
        <label className="label-primary">Special Requests (Optional)</label>
        <textarea
          name="specialRequests"
          value={formData.specialRequests || ""}
          onChange={handleChange}
          className="input-primary"
          rows={4}
          placeholder="Any special requirements or preferences?"
        />
      </div>

      {error && <div className="p-4 bg-red-900 border border-red-700 rounded text-red-100">{error}</div>}
      {success && <div className="p-4 bg-green-900 border border-green-700 rounded text-green-100">Booking created successfully!</div>}

      <Button type="submit" disabled={loading} variant="primary">
        {loading ? "Processing..." : "Continue to Checkout"}
      </Button>
    </form>
  );
}
