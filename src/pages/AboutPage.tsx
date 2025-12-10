import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'motion/react';

export default function AboutPage() {
  const values = [
    {
      title: 'Quality',
      description: 'We source the finest materials and work with skilled artisans to create pieces that last.',
    },
    {
      title: 'Sustainability',
      description: 'Our commitment to the environment guides every decision we make, from sourcing to packaging.',
    },
    {
      title: 'Timelessness',
      description: 'We design pieces that transcend trends, creating a wardrobe you\'ll love for years to come.',
    },
    {
      title: 'Craftsmanship',
      description: 'Every detail matters. Our dedication to exceptional craftsmanship is evident in every stitch.',
    },
  ];

  return (
    <div>
      <Header />

      {/* Hero */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1638717366457-dbcaf6b1afbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt="About Us"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center text-white px-4"
        >
          <h1 className="mb-4 text-white">About Élégance</h1>
          <p className="max-w-2xl mx-auto">
            Crafting timeless pieces for the modern minimalist since 2020
          </p>
        </motion.div>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="mb-6">Our Story</h2>
          <div className="space-y-4 text-neutral-600">
            <p>
              Élégance was born from a simple belief: that fashion should be timeless, not temporary. 
              In a world of fast fashion and fleeting trends, we set out to create something different—pieces 
              that you'll reach for season after season, year after year.
            </p>
            <p>
              Our journey began in 2020, when our founder, inspired by the clean lines of Scandinavian 
              design and the quality of European craftsmanship, decided to create a brand that embodied 
              both elegance and simplicity. Today, we continue to design with intention, choosing quality 
              over quantity and timelessness over trends.
            </p>
            <p>
              Every piece in our collection is carefully considered, from the selection of sustainable 
              materials to the final stitch. We work with skilled artisans who share our commitment to 
              excellence, creating garments that feel as good as they look.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-neutral-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Our Values</h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <h3 className="mb-3">{value.title}</h3>
                <p className="text-neutral-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="mb-6">Our Commitment</h2>
          <p className="text-neutral-600 mb-8">
            We're committed to creating fashion that's better for you and better for the planet. 
            That's why we use sustainable materials, ethical manufacturing practices, and minimal 
            packaging. We believe that true elegance comes from doing the right thing.
          </p>
          <p className="text-neutral-600">
            Thank you for being part of our journey. Together, we're proving that fashion can 
            be both beautiful and responsible.
          </p>
        </div>
      </section>

      <Footer/>
    </div>
  );
}
