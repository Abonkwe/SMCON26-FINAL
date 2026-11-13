import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ServiceCategory, ProviderSearchResult, Booking } from '../../types';
import { api } from '../../lib/api';
import { StatusPill } from '../../components/common/StatusPill';
import { RoleSwitcher } from '../../components/layout/RoleSwitcher';
import {
  Search, MapPin, ShieldAlert, ArrowRight, Calendar, CheckCircle2,
  Clock, Sparkles, Zap, Wrench, Droplet, Flame, Shirt, Truck, Star,
} from 'lucide-react';

interface HomeProps {
  onSelectCategory: (categorySlug: string) => void;
  onSelectTab: (tab: string) => void;
  onRequestService: (provider?: ProviderSearchResult) => void;
  onOpenReport: () => void;
}

const serviceImages = [
  'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85',
];

const serviceIcons = [Wrench, Sparkles, Droplet, Flame, Shirt, Truck, Zap];

export const Home: React.FC<HomeProps> = ({ onSelectCategory, onSelectTab, onRequestService, onOpenReport }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.catalogue.getCategories().then(setCategories).catch(console.error);
    api.providers.search({ verified_only: true }).then((res) => setProviders(res.slice(0, 3))).catch(console.error);
    api.bookings.list().then((bks) => {
      const active = bks.find((b) => ['CONFIRMED', 'IN_PROGRESS', 'QUOTATION_RECEIVED'].includes(b.status));
      if (active) setActiveBooking(active);
    }).catch(console.error);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectTab('explore');
  };
  const firstName = user?.display_name ? user.display_name.split(' ')[0] : '';
  const categoryName = (category: ServiceCategory) => language === 'fr' ? category.name_fr : category.name;
  const categoryClick = (category: ServiceCategory) => {
    if (category.slug === 'power-rental') onSelectTab('rentals');
    else onSelectCategory(category.slug);
  };

  return (
    <div className="alice-home">
      <div className="alice-role-control"><RoleSwitcher /></div>

      <section className="alice-hero">
        <div className="alice-hero-image" aria-hidden="true" />
        <div className="alice-hero-shade" aria-hidden="true" />
        <div className="alice-hero-content">
          <div className="alice-eyebrow"><span className="alice-eyebrow-dot" /> {t('greeting')}{firstName ? `, ${firstName}` : ''}</div>
          <h1>Find trusted help<br /><span>for your home.</span></h1>
          <p>Repairs, cleaning, deliveries and more — book reliable local services in Buea with confidence.</p>
          <form className="alice-hero-search" onSubmit={submitSearch}>
            <Search className="h-5 w-5 shrink-0 text-royal-indigo" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} />
            <button type="submit">Search <ArrowRight className="h-4 w-4" /></button>
          </form>
          <div className="alice-hero-meta"><span><MapPin className="h-4 w-4" /> Serving Buea, Cameroon</span><span><CheckCircle2 className="h-4 w-4" /> Verified local professionals</span></div>
        </div>
        <div className="alice-hero-note"><span className="alice-note-icon"><Sparkles className="h-4 w-4" /></span><span><b>Good help, close by</b><small>Book a service in minutes</small></span></div>
      </section>

      <section className="alice-category-rail" aria-label="Browse service categories">
        <button className="alice-category-all" onClick={() => onSelectTab('explore')}><span className="alice-category-icon"><Search /></span><span>All services</span></button>
        {categories.map((category, index) => {
          const Icon = serviceIcons[index % serviceIcons.length];
          return <button key={category.id} onClick={() => categoryClick(category)}><span className="alice-category-icon"><Icon /></span><span>{categoryName(category)}</span></button>;
        })}
      </section>

      <div className="alice-content-wrap">
        {activeBooking && <div className="alice-booking-banner">
          <div className="alice-booking-icon"><Calendar className="h-5 w-5" /></div>
          <div className="alice-booking-copy"><span>Your service is underway</span><b>{activeBooking.service_name} <span className="alice-booking-muted">with {activeBooking.provider_name}</span></b></div>
          <StatusPill status={activeBooking.status} />
          <button onClick={() => onSelectTab('bookings')}>View booking <ArrowRight className="h-4 w-4" /></button>
        </div>}

        <section className="alice-section">
          <div className="alice-section-heading"><div><span className="alice-kicker">MADE FOR EVERYDAY LIVING</span><h2>Services you can count on</h2><p>Skilled local professionals, ready when you need them.</p></div><button className="alice-text-link" onClick={() => onSelectTab('explore')}>Explore all services <ArrowRight className="h-4 w-4" /></button></div>
          <div className="alice-service-grid">
            {categories.slice(0, 3).map((category, index) => {
              const Icon = serviceIcons[index % serviceIcons.length];
              const descriptions = [category.description, 'A fresh, comfortable home without the hassle.', 'Fast, dependable help from trusted neighbourhood experts.'];
              return <article className="alice-service-card" key={category.id}>
                <button className="alice-service-image" onClick={() => categoryClick(category)} aria-label={`Explore ${categoryName(category)}`} style={{ backgroundImage: `url("${serviceImages[index]}")` }}>
                  <span className="alice-image-label"><Icon className="h-4 w-4" /> Local experts</span>
                </button>
                <div className="alice-service-body"><span className="alice-service-overline">{index === 0 ? 'HOME REPAIRS' : index === 1 ? 'CLEAN & CARE' : 'EVERYDAY ESSENTIALS'}</span><h3>{categoryName(category)}</h3><p>{descriptions[index]}</p><button className="alice-service-link" onClick={() => categoryClick(category)}>Explore service <ArrowRight className="h-4 w-4" /></button></div>
              </article>;
            })}
          </div>
        </section>

        <section className="alice-benefits">
          <div className="alice-benefit-intro"><span className="alice-kicker">THE ALICE DIFFERENCE</span><h2>Local service.<br />Peace of mind.</h2><p>Find the right help and book with confidence, every time.</p></div>
          <div className="alice-benefit"><span><ShieldAlert /></span><b>Vetted professionals</b><p>Identity-checked providers you can feel good about inviting in.</p></div>
          <div className="alice-benefit"><span><Clock /></span><b>Simple, reliable booking</b><p>Make a request and keep track of your service in one place.</p></div>
          <div className="alice-benefit"><span><Star /></span><b>Support that cares</b><p>Our team is here to help if anything doesn’t go to plan.</p></div>
        </section>

        <section className="alice-lower-grid">
          <div className="alice-power-card"><div><span className="alice-kicker">POWER THROUGH THE OUTAGES</span><h2>Reliable power,<br />wherever you need it.</h2><p>Rent a clean 2 kWh power station for your home or office in Buea.</p><button onClick={() => onSelectTab('rentals')}>Explore power rentals <ArrowRight className="h-4 w-4" /></button></div><span className="alice-power-icon"><Zap /></span></div>
          <div className="alice-providers-card"><div className="alice-section-heading compact"><div><span className="alice-kicker">NEAR YOUR NEIGHBOURHOOD</span><h2>Meet trusted providers</h2></div><button className="alice-text-link" onClick={() => onSelectTab('explore')}>See all <ArrowRight className="h-4 w-4" /></button></div>{providers.length ? providers.slice(0, 2).map((provider) => <div className="alice-provider-row" key={provider.id}><div className="alice-provider-avatar">{provider.display_name?.charAt(0) || 'A'}</div><div><b>{provider.display_name}</b><span><CheckCircle2 className="h-3.5 w-3.5" /> Verified professional</span></div><button onClick={() => onRequestService(provider)} aria-label={`Book ${provider.display_name}`}><ArrowRight className="h-4 w-4" /></button></div>) : <p className="alice-empty-providers">Our local professionals are ready to help.</p>}</div>
        </section>

        <section className="alice-safety-strip"><span className="alice-safety-icon"><ShieldAlert /></span><div><b>Your safety matters</b><p>Report an incident or reach our support team for help.</p></div><button onClick={onOpenReport}>Trust &amp; safety <ArrowRight className="h-4 w-4" /></button></section>
      </div>

      <footer className="alice-footer"><div className="alice-footer-brand"><span className="alice-brand-mark">A</span><div><b>ALICE</b><small>Local help, made simple.</small></div></div><div className="alice-footer-links"><button onClick={() => onSelectTab('explore')}>Explore services</button><button onClick={() => onSelectTab('bookings')}>My bookings</button><button onClick={onOpenReport}>Help &amp; safety</button></div><span>© 2026 Alice · Buea, Cameroon</span></footer>
    </div>
  );
};
