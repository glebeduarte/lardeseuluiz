interface PageHeroProps {
  title: string;
  description: string;
  variant?: 'admin' | 'student';
}

export function PageHero({ title, description, variant = 'admin' }: PageHeroProps) {
  return (
    <div className={`${variant === 'admin' ? 'gradient-admin' : 'gradient-primary'} rounded-none px-6 sm:px-10 md:px-12 py-8 sm:py-10 text-white relative overflow-hidden`}>
      <div className="relative z-10">
        <h1 className="text-2xl sm:text-[28px] font-display font-bold">{title}</h1>
        <p className="text-white/65 text-[13px] mt-1">{description}</p>
      </div>
    </div>
  );
}
