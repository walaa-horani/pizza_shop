import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative min-h-[1024px] pt-32 pb-20 flex items-center overflow-hidden bg-surface">
          <div className="absolute inset-0 z-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-container-high via-surface to-surface"></div>
          <div className="relative z-10 w-full max-w-[1920px] mx-auto px-8 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 flex flex-col items-start pt-10 lg:pt-0 relative z-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-highest border border-outline-variant/15 mb-8 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                <span className="material-symbols-outlined text-tertiary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <span className="font-label text-xs tracking-[0.05rem] uppercase text-tertiary font-bold">20% OFF First Order</span>
              </div>
              <h1 className="font-headline font-bold text-6xl md:text-8xl lg:text-[7rem] leading-[0.85] tracking-tight text-on-surface uppercase mb-8">
                Forged<br />In <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container">Fire.</span>
              </h1>
              <p className="font-body text-lg md:text-xl text-on-surface-variant max-w-md leading-relaxed mb-12">
                Experience the raw, tactile warmth of true Neapolitan tradition. 48-hour fermented dough, blistered to perfection in our 900° wood-fired ovens.
              </p>
              <div className="group relative bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-lg px-10 py-5 rounded-xl shadow-[0_20px_40px_rgba(196,30,58,0.25)] hover:shadow-[0_25px_50px_rgba(196,30,58,0.4)] transition-all duration-300 overflow-hidden flex items-center gap-4 cursor-pointer">
                <Link href="/menu" className="absolute inset-0 z-20"></Link>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10"></div>
                <span className="relative z-10">Order Now</span>
                <span className="material-symbols-outlined relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
            <div className="lg:col-span-7 relative h-[614px] lg:h-[921px] w-full flex items-center justify-center z-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,179,180,0.05)_0%,transparent_60%)]"></div>
              <img
                alt="Signature Neapolitan Pizza"
                className="absolute right-[-10%] md:right-[-20%] lg:right-[-15%] top-1/2 -translate-y-1/2 w-[120%] md:w-[130%] lg:w-[140%] max-w-none object-contain drop-shadow-[0_60px_100px_rgba(0,0,0,0.8)] hover:scale-[1.02] transition-transform duration-700 ease-out"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNQ6o9eDYtJhhGVr4LeeWd_bCqnQEZRs25lnRzxHPhGlIWXoZz6lD0hcfA5SbXrZiqIPhrYJPjwxROZPygkAse9TIs-k5lsM-5HFT2C77z_dSNaIDmS7jUbvkzTh0qHvBpNbcMlsQ3W5MCikD8zINp00PbMfDIa27l3yRxnK_KmwCxOjPkjn_fWWfmxDg0ELOLd4yEtOOqkqGhVKWfo6vBqHMJj5O3C_7NCeXHjMJIFYVSDYBxbyP-V_7p9qdsphSPUma5S_BK8Q0"
                style={{
                  maskImage: "radial-gradient(circle, black 70%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(circle, black 70%, transparent 100%)"
                }}
              />
            </div>
          </div>
        </section>
        <section className="py-32 bg-surface-container-low relative border-t border-outline-variant/5">
          <div className="max-w-[1920px] mx-auto px-8 md:px-16">
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
              <div className="max-w-2xl">
                <h2 className="font-headline font-bold text-4xl md:text-5xl text-on-surface uppercase tracking-tight mb-4">
                  The Anatomy of <br />Perfection
                </h2>
                <p className="font-body text-on-surface-variant text-lg">We don't compromise. Our process is a strict adherence to centuries-old techniques, engineered for the modern palate.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group relative bg-surface-container-high rounded-3xl p-8 overflow-hidden hover:bg-surface-bright transition-colors duration-500 shadow-[0_30px_60px_rgba(229,226,225,0.02)] border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500"></div>
                <div className="relative h-48 mb-8 flex items-center justify-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
                  <img
                    alt="Dough Fermentation"
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transform"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtOlOxpxE0zrYX1O3MVIi3HIbHA2Q7CJ_X20sXdrPvVgnjJG3XWKE98MP2q4tCE0bpRxzv_OnkXVR6AuUGisv9-w9MDQUgyT8bjgYFNnWjcKz0vG-eEJ9zKhP7zJy2T1fh66OPu3VNMqbNJgI9YVmZC3mHgSTTjh1tUFYxy3sBHTLDGLtYp8UYYp83jUOEzb10S4lm_6DyGDFNblbjuAouAFAfag2q95KJG68ojpvfN8G5JPlGnK7muIVOrucAGMiqGa407TwJk7s"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                  <span className="material-symbols-outlined absolute bottom-4 left-4 text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                </div>
                <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">48h Fermentation</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Slow-proofed for complex flavor and a light, airy cornicione that digests effortlessly.</p>
              </div>
              <div className="group relative bg-surface-container-high rounded-3xl p-8 overflow-hidden hover:bg-surface-bright transition-colors duration-500 shadow-[0_30px_60px_rgba(229,226,225,0.02)] border border-outline-variant/10 translate-y-0 md:translate-y-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary-container/10 transition-colors duration-500"></div>
                <div className="relative h-48 mb-8 flex items-center justify-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
                  <img
                    alt="Wood-fire Baking"
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transform"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAU5rpizVPXCL8vH-ZDD-DHB-6cAmqPXU98leuGzTG1_C6CzjDzLr1toYzON2UUfCUz_zhqT4V5a9en8S4qAVptmTZO3lzDFlsQBRt7jwILYT8M4b7MgKc9ClXsLyDHb25ez_L8QJohH3fSU0GYfGispYDFS5smYyev5Q2Za0nnVpHZ4QEMoHJCtj9USBMvz5uAV6IQ9zlh3PKSzgYJ5cI9UEZPvCVaGvCjALMw9ssTkj1D69x8h_bactMxcjKCChzAPQCY5osvWAQ"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                  <span className="material-symbols-outlined absolute bottom-4 left-4 text-4xl text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>mode_heat</span>
                </div>
                <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">900° Wood-Fire</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Baked in exactly 90 seconds. The fierce heat locks in moisture while creating the signature leopard spotting.</p>
              </div>
              <div className="group relative bg-surface-container-high rounded-3xl p-8 overflow-hidden hover:bg-surface-bright transition-colors duration-500 shadow-[0_30px_60px_rgba(229,226,225,0.02)] border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-tertiary/10 transition-colors duration-500"></div>
                <div className="relative h-48 mb-8 flex items-center justify-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
                  <img
                    alt="Fast Delivery"
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transform"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoXXwZbH5sqbvV66GSp4Q-yshbILQOBQVPN3IfNWAZFy2dKFbYE3--vo8ZorkOYcnkdYjPj51RHY6gNSC_DreHrxn4zJ8yTbKUoip06Dyr9MrY-u0QL5Fx4gTx8XN2GYDDTli6Zq0YTWB7Jj9-IurPuc8JbjnLjcYDa9AMoe4YACkCfwsHxhpwstKV6PN6X7BUHSeVSILT-KqNZ_bjW6rgIPyrQt_oa8TGOlEVgrqy5ESDSL0yq43b7cdbu-j1nkpXwVMUhTcX1Ns"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                  <span className="material-symbols-outlined absolute bottom-4 left-4 text-4xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>two_wheeler</span>
                </div>
                <h3 className="font-headline font-bold text-2xl text-on-surface mb-3">Thermal Delivery</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Engineered packaging maintains optimal humidity and temperature from our hearth to your table.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
