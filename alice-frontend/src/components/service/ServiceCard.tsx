import React from 'react';
import { ServiceCategory } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Wrench, Sparkles, Droplet, Flame, Shirt, Truck, Zap } from 'lucide-react';

interface ServiceCardProps {
  category: ServiceCategory;
  onClick: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ category, onClick }) => {
  const { language } = useLanguage();

  const getIcon = (slug: string) => {
    switch (slug) {
      case 'repairs':
        return <Wrench className="w-5 h-5 text-royal-indigo" />;
      case 'cleaning':
        return <Sparkles className="w-5 h-5 text-electric-lavender" />;
      case 'water':
        return <Droplet className="w-5 h-5 text-sky-500" />;
      case 'gas':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'laundry':
        return <Shirt className="w-5 h-5 text-orchid-pink" />;
      case 'deliveries':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'power-rental':
        return <Zap className="w-5 h-5 text-amber-400" />;
      default:
        return <Wrench className="w-5 h-5 text-royal-indigo" />;
    }
  };

  const displayName = language === 'fr' ? category.name_fr : category.name;

  return (
    <div
      onClick={onClick}
      className="bg-pure-white rounded-2xl p-3 border border-cloud-gray shadow-card hover:shadow-elevated transition-all active:scale-98 cursor-pointer flex flex-col items-center text-center group"
    >
      <div className="w-12 h-12 rounded-2xl bg-cloud-gray/60 group-hover:bg-indigo-50 flex items-center justify-center mb-2 transition-colors">
        {getIcon(category.slug)}
      </div>
      <span className="text-xs font-bold text-midnight-navy line-clamp-2 leading-tight">
        {displayName}
      </span>
    </div>
  );
};

