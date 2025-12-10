import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Thank you for your message! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="mb-4">Get in Touch</h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Have a question or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full bg-neutral-900 hover:bg-neutral-800">
                <Send size={18} className="mr-2" />
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                      <Mail className="text-neutral-700" size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1">Email</p>
                    <p className="text-neutral-600">hello@elegance.com</p>
                    <p className="text-neutral-600">support@elegance.com</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                      <Phone className="text-neutral-700" size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1">Phone</p>
                    <p className="text-neutral-600">+1 (555) 123-4567</p>
                    <p className="text-sm text-neutral-500 mt-1">Mon-Fri: 9AM - 6PM EST</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-neutral-700" size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1">Address</p>
                    <p className="text-neutral-600">
                      123 Fashion Avenue<br />
                      New York, NY 10001<br />
                      United States
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 p-6 rounded-lg">
              <h4 className="mb-3">Customer Service</h4>
              <p className="text-sm text-neutral-600 mb-4">
                Our customer service team is available Monday through Friday, 9AM to 6PM EST. 
                We typically respond to all inquiries within 24 hours.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-neutral-600">
                  <span className="text-neutral-900">Returns & Exchanges:</span> support@elegance.com
                </p>
                <p className="text-neutral-600">
                  <span className="text-neutral-900">Order Inquiries:</span> orders@elegance.com
                </p>
                <p className="text-neutral-600">
                  <span className="text-neutral-900">General Questions:</span> hello@elegance.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div>
              <h4 className="mb-2">What is your return policy?</h4>
              <p className="text-neutral-600">
                We accept returns within 30 days of delivery. Items must be unworn, unwashed, and in original condition with tags attached.
              </p>
            </div>
            <div>
              <h4 className="mb-2">How long does shipping take?</h4>
              <p className="text-neutral-600">
                Standard shipping typically takes 5-7 business days. Express shipping is available at checkout for faster delivery.
              </p>
            </div>
            <div>
              <h4 className="mb-2">Do you ship internationally?</h4>
              <p className="text-neutral-600">
                Yes, we ship to most countries worldwide. International shipping times and costs vary by destination.
              </p>
            </div>
            <div>
              <h4 className="mb-2">How can I track my order?</h4>
              <p className="text-neutral-600">
                Once your order ships, you'll receive a tracking number via email. You can also track your order in your account dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
