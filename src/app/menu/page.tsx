'use client';
import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Pizza {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags?: string[];
  theme: 'standard' | 'premium' | 'tall';
}

const pizzas: Pizza[] = [
  {
    id: "diavola",
    name: "Diavola",
    description: "San Marzano DOP, fior di latte, spicy Calabrian salame, fresh basil, EVOO.",
    price: 21,
    theme: "tall",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDWXeXKh69Z-IZab9ytz2eERYeKSRiRoS98S_YvQLzoblxfsbjJQ-P7wxY-IHIsqzQy_YBuGQImpJq6HcYFwkv8JrRSWoc7vL8QredgXQGSfi2Oepnf1uu9ABs0NbyiVLdGx7KRsPu937tOEMQ25KoHFd9SceVA8t8BvqbOQ9PpwyjgFOeX72aSOWQoQ_9mswlc_bpDNrWeiwbyZLwPrSu67VyoJa-HUhkLKzroGsyAjOWA0rkxwlrN_e-yLh4yIELKocRcPKES2kk"
  },
  {
    id: "margherita",
    name: "Margherita",
    description: "The undisputed classic. San Marzano DOP, fresh fior di latte mozzarella, basil.",
    price: 18,
    theme: "standard",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8747IR60efrqB_OIofJy66twn5tvNfF1RIcz-xVqhfYK_dyBnI-Tbt_uSY1ISVvgLIKhub9RMjuyNbJFW01ghZcCUahAZIKP6rVfANoi-KMBxbabeYltWbCLRzmuB48BQ4ltnNuzOoTOxbAQQV4uwYzu2LWisQQnzN-qEHFXYtd2-07wV-2eF6UbcRwdeUXIOPujyuKLk4BngFCJGfROAuAGKO20SbE5bmhjxLxTnErxtd_zpUNhfCZuDVEFUpjMOrgqZsyhkIyQ"
  },
  {
    id: "tartufo",
    name: "Tartufo Bianco",
    description: "Truffle cream base, roasted wild mushrooms, fior di latte, 24-month Parmigiano, white truffle oil.",
    price: 28,
    theme: "premium",
    tags: ["Chef's Reserve"],
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBjaGSwGUVGE9B5REKz98SZwJoXpe26OImf1U6neTj3QdpgvDihtNk8SSoDhxO0Mzzo-R_vJZlPghF0waeTJ0kApLatTLGBmkAfAk1jE4rTkZ_1JT7zF9wpndY64uC6U1J-nBmXzyElQemlhWhXwqPkLHLvuMeaKiuxKpOXMeMJ45kC_c63a765yj13Jy9olltpp_UPMSJ_pOTfilyLc2Sg23is3yWA_fhHKc_btlbiY36hy6FDGh3GkpbKGcaP9L0FOaCBQeXFXhY"
  },
  {
    id: "quattro",
    name: "Quattro Formaggi",
    description: "Fior di latte, gorgonzola dolce, fontina, parmigiano reggiano. No tomato.",
    price: 20,
    theme: "standard",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIMyJC-bLHOq4uUox3MVdqc0x4nAsgA-XJwL29mSIUiiG8t85T_tkDaU-wPfFOlTKNoPyAmhwjhRuWO_muBpMAAgmxrmZ2yUm6jqw1TU5-K0ygznMtUJo2XYuMPX7LbK9axHGGIxGt4AVipj4xU_YeTQ2d-WworD_75MJEdwkC9JkaFgsj9HwHB7ZrEFDUH2F01ZZ-ArIV4DspdSD1JQ7zzZYD5J2ciBYOYwmF5xMFVdfB70j6iscf29uGguxHIhf8pxYGJVGHEek"
  },
  {
    id: "marinara",
    name: "Marinara",
    description: "The purist's choice. San Marzano DOP, oregano, garlic, EVOO. Naturally vegan.",
    price: 15,
    theme: "standard",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZOfqp51yfOvrEBVo-VgFe5s73dcW2hGAC4xYoRplO8iWRgZBMdOkqhRX5y42OE7lk_Yn-CuyVkLp3e1NjgvnlikiHJES_uNOhNK-Q4vlcKWqAIjxqLSpa8DwfS52HpfR2kzq6c9R6kmF1osn0IoHexWYowCxAaHXFusWLu_zDjiRcdcYL3eRtZnAH0q5SE8IWdRYjBi094iSKNWL-nZDNckA6_7GNLuuKFRjXm_EEYWPHlw1KTyHnWY6V-Be-IZ1KdA0uw5adVAs"
  },
  {
    id: "salsiccia",
    name: "Salsiccia e Friarielli",
    description: "Smoked provola, fennel sausage, bitter Neapolitan broccoli rabe.",
    price: 22,
    theme: "standard",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7qaR0jipjdUWjaDVCWfsghYQs1fXRpvUo3Mvh03EcEgFeUONT9Ikvak5-dZSQ1Bmrp6UUsHuXeNmxDGjz_-acmQjlH_U3HeTLRccFely---biE3RTFUTFZ2FRl2vBk9Rvftsu_SYG6igDPAE2dShu7QxXQPKsd6OrDsa0_RasXjHq6wUa-XYWJGJQR-NmXB1cbRgw9C5aCARS_clgNhhMbJXR7B0nP-FmoEDiCYOV64HROHWMIxMjIrbWfIcTiElKx3xkOr3tksg"
  }
];

function SkeletonCard({ theme }: { theme: 'standard' | 'premium' | 'tall' }) {
  const isPremium = theme === 'premium';
  const heightClass = theme === 'tall' ? 'min-h-[400px]' : theme === 'premium' ? 'min-h-[380px]' : 'min-h-[300px]';
  const bgClass = isPremium ? 'bg-surface-container-lowest' : 'bg-surface-container-low';
  
  return (
    <article className={`break-inside-avoid mb-12 relative ${bgClass} rounded-[1.5rem] p-6 pt-24 ${heightClass} flex flex-col justify-end animate-pulse`}>
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-surface-container-high rounded-full border-4 border-surface"></div>
      <div className="relative z-10 w-full mt-auto">
        <div className="h-8 bg-surface-container-high rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-surface-container-high rounded w-full mb-2"></div>
        <div className="h-4 bg-surface-container-high rounded w-5/6 mb-8"></div>
        <div className="flex justify-between items-center border-t border-outline-variant/10 pt-4">
          <div className="h-6 bg-surface-container-high rounded w-16"></div>
          <div className="h-10 bg-surface-container-high rounded-xl w-24"></div>
        </div>
      </div>
    </article>
  );
}

export default function MenuGallery() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-[1920px] mx-auto w-full min-h-screen">
        <header className="mb-16 relative">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none"></div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-on-surface to-on-surface/50 mb-6">
            The Masterpiece <br />Collection.
          </h1>
          <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl font-light">
            Hand-stretched daily. Fired at 900°F. Experience the raw warmth of Neapolitan tradition, engineered for the modern palate.
          </p>

          <div className="flex flex-wrap gap-3 mt-10">
            <button className="bg-secondary-container text-on-secondary-container px-5 py-2.5 rounded-xl font-body text-sm font-semibold tracking-wide transition-all shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
              All Signatures
            </button>
            <button className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl font-body text-sm font-medium hover:bg-surface-bright transition-all">
              Rosso (Red Base)
            </button>
            <button className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl font-body text-sm font-medium hover:bg-surface-bright transition-all">
              Bianca (White Base)
            </button>
            <button className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-xl font-body text-sm font-medium hover:bg-surface-bright transition-all">
              Plant-Based
            </button>
          </div>
        </header>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 mt-24">
          {loading ? (
            <>
              {pizzas.map((p, i) => (
                <SkeletonCard key={i} theme={p.theme} />
              ))}
            </>
          ) : (
            <>
              {pizzas.map((pizza) => {
                const isPremium = pizza.theme === 'premium';
                const isTall = pizza.theme === 'tall';
                
                const minHeight = isTall ? 'min-h-[400px]' : isPremium ? 'min-h-[380px]' : '';
                const bgClass = isPremium ? 'bg-surface-container-lowest border border-outline-variant/10' : 'bg-surface-container-low';
                
                // Image positioning based on original HTML specifics
                let imgClasses = 'absolute object-cover rounded-full pointer-events-none z-20 transition-transform duration-700 ';
                if (pizza.id === 'diavola') imgClasses += '-top-16 -right-12 w-72 h-72 drop-shadow-[0_30px_50px_rgba(0,0,0,0.8)] group-hover:scale-105 group-hover:rotate-3 border-4 border-surface';
                else if (pizza.id === 'margherita') imgClasses += '-top-12 -left-8 w-56 h-56 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:scale-110 group-hover:-rotate-3 border-4 border-surface';
                else if (pizza.id === 'tartufo') imgClasses += '-top-10 -right-6 w-64 h-64 drop-shadow-[0_40px_60px_rgba(0,0,0,0.9)] group-hover:scale-105 group-hover:rotate-6';
                else if (pizza.id === 'quattro') imgClasses += '-top-16 left-1/2 -translate-x-1/2 w-52 h-52 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:scale-110 group-hover:rotate-12 border-4 border-surface';
                else if (pizza.id === 'marinara') imgClasses += '-top-12 -right-6 w-48 h-48 drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] group-hover:scale-105 group-hover:-rotate-6 border-2 border-surface';
                else if (pizza.id === 'salsiccia') imgClasses += '-top-10 -left-10 w-60 h-60 drop-shadow-[0_25px_50px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:rotate-6 border-4 border-surface';

                return (
                  <Link href={`/product`} key={pizza.id} className={`block break-inside-avoid mb-12 group relative ${bgClass} rounded-[1.5rem] p-6 pt-24 shadow-[0_30px_60px_-15px_rgba(229,226,225,0.03)] hover:shadow-[0_40px_80px_-20px_rgba(229,226,225,0.08)] transition-all duration-500 overflow-hidden ${isPremium ? '' : 'hover:bg-surface-container-highest'} ${minHeight} flex flex-col justify-end`}>
                    {isPremium && <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-container-low opacity-50 z-0"></div>}
                    
                    <img className={imgClasses} src={pizza.image} alt={pizza.name} />
                    
                    <div className={`relative z-10 mt-auto flex flex-col justify-end h-full ${pizza.id === 'margherita' ? 'pl-4' : ''} ${pizza.id === 'quattro' ? 'text-center mt-4' : ''} ${pizza.id === 'salsiccia' ? 'ml-10' : ''}`}>
                      {pizza.tags && pizza.tags.includes("Chef's Reserve") && (
                        <div className="mb-2 inline-flex items-center gap-1 text-tertiary font-headline text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Chef's Reserve
                        </div>
                      )}
                      
                      <h3 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-3">{pizza.name}</h3>
                      <p className={`font-body text-on-surface-variant text-sm mb-6 ${pizza.id==='quattro'?'mx-auto max-w-[90%]':'max-w-[85%]'} leading-relaxed`}>{pizza.description}</p>
                      
                      <div className={`flex items-center justify-${pizza.id === 'quattro' ? 'center gap-6' : 'between'} opacity-0 translate-y-6 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out ${isPremium ? 'border-t border-outline-variant/20 pt-4' : ''}`}>
                        <span className="font-headline text-tertiary font-black text-2xl tracking-tight">${pizza.price}</span>
                        
                        {isPremium ? (
                          <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl px-4 py-2.5 font-headline font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(196,30,58,0.4)] transition-all transform active:scale-95">
                            Add <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                          </button>
                        ) : pizza.id === 'diavola' ? (
                          <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl px-5 py-3 font-headline font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(196,30,58,0.4)] transition-all transform active:scale-95">
                            Quick Add <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                          </button>
                        ) : pizza.id === 'quattro' ? (
                          <button className="bg-surface-bright text-on-surface rounded-xl px-4 py-2 font-headline font-bold text-sm hover:bg-primary hover:text-on-primary transition-colors transform active:scale-95">
                            Add to Order
                          </button>
                        ) : pizza.id === 'marinara' ? (
                          <button className="text-primary hover:text-primary-container font-headline font-bold text-sm flex items-center gap-1 transition-colors">
                            Add <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                          </button>
                        ) : (
                          <button className="bg-surface-bright text-on-surface rounded-xl p-2.5 hover:bg-primary hover:text-on-primary transition-colors transform active:scale-95">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </main>
      
      <div className="fixed bottom-6 right-6 z-40">
        <Link href="/cart" className="bg-surface-container-highest/90 backdrop-blur-md p-4 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center gap-4 border border-outline-variant/20 hover:bg-surface-container-highest transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center relative">
            <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center font-headline">2</span>
          </div>
          <div className="pr-4">
            <p className="font-body text-xs text-on-surface-variant uppercase tracking-widest mb-0.5">Your Tray</p>
            <p className="font-headline text-tertiary font-bold text-lg leading-none group-hover:text-primary transition-colors">$39.00</p>
          </div>
        </Link>
      </div>

      <Footer />
    </>
  );
}
