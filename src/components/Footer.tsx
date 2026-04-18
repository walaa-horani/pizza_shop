export default function Footer() {
  return (
    <footer className="bg-[#131313] w-full py-12 border-t border-[#E5E2E1]/15">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 w-full gap-6 max-w-[1920px] mx-auto">
        <div className="text-[#E5E2E1] font-headline font-bold text-xl uppercase tracking-wider">
          HEARTH
        </div>
        <div className="font-body text-[12px] tracking-[0.05rem] uppercase text-[#E5E2E1]/40 text-center">
          © 2024 THE DIGITAL HEARTH. BORN IN NAPLES, ENGINEERED FOR DELIGHT.
        </div>
        <div className="flex gap-6 font-body text-[12px] tracking-[0.05rem] uppercase">
          <a className="text-[#E5E2E1]/40 hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Privacy</a>
          <a className="text-[#E5E2E1]/40 hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Terms</a>
          <a className="text-[#E5E2E1]/40 hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Sourcing</a>
          <a className="text-[#E5E2E1]/40 hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Allergens</a>
        </div>
      </div>
    </footer>
  );
}
