import Link from 'next/link';
import AuthButtons from './AuthButtons';
import CartBadge from './CartBadge';

export default function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-[20px] shadow-none">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-[1920px] mx-auto">
        <Link href="/" className="text-2xl font-black tracking-tighter text-[#E5E2E1] font-headline uppercase hover:opacity-80 transition-opacity">
          HEARTH
        </Link>
        <div className="hidden md:flex items-center gap-8 font-body">
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/menu">Menu</Link>
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/menu">Gallery</Link>
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/">How it Works</Link>
          <Link className="text-[#E5E2E1]/70 font-medium hover:text-[#E5E2E1] transition-colors hover:bg-[#E5E2E1]/5 duration-300 px-3 py-2 rounded-lg" href="/">Offers</Link>
        </div>
        <div className="flex items-center gap-4 text-[#FFB3B4]">
          <CartBadge />
          <AuthButtons />
        </div>
      </div>
    </nav>
  );
}
