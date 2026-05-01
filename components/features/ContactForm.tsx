"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ContactFormData } from "@/types";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
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
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit inquiry");
      }

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-luxury-gold mb-6">Contact Us</h2>

      <Input
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <Input
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        required
      />

      <Input
        label="Phone (Optional)"
        type="tel"
        name="phone"
        value={formData.phone || ""}
        onChange={handleChange}
      />

      <Input
        label="Subject"
        name="subject"
        value={formData.subject}
        onChange={handleChange}
        required
      />

      <div>
        <label className="label-primary">Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="input-primary"
          rows={6}
          placeholder="Your message here..."
          required
        />
      </div>

      {error && <div className="p-4 bg-red-900 border border-red-700 rounded text-red-100">{error}</div>}
      {success && <div className="p-4 bg-green-900 border border-green-700 rounded text-green-100">Thank you! We&apos;ll get back to you soon.</div>}

      <Button type="submit" disabled={loading} variant="primary">
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
