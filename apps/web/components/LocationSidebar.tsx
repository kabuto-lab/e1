'use client';

import { useState } from 'react';
import { ChevronDown, MapPin, X } from 'lucide-react';

export interface GeoCountry {
  country: string;
  code: string;
  flag?: string;
  cities: string[];
}

interface LocationSidebarProps {
  selectedCountry: string;
  selectedCity: string;
  onSelect: (country: string, city: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  geoData: GeoCountry[];
}

function SidebarContent({
  selectedCountry,
  selectedCity,
  onSelect,
  onMobileClose,
  geoData,
}: Omit<LocationSidebarProps, 'mobileOpen'>) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(geoData.length > 0 ? [geoData[0].code] : []),
  );

  const toggle = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSelect = (country: string, city: string) => {
    onSelect(country, city);
    onMobileClose();
  };

  return (
    <nav className="flex flex-col py-3">
      <button
        onClick={() => handleSelect('', '')}
        className={`flex items-center gap-2.5 px-4 py-2 text-left font-body text-sm transition-colors ${
          !selectedCountry && !selectedCity
            ? 'bg-[#d4af37]/[0.08] text-[#d4af37]'
            : 'text-white/45 hover:text-white/75'
        }`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Все страны
      </button>

      <div className="mx-4 my-2 h-px bg-white/[0.06]" />

      {geoData.map(({ country, code, flag, cities }) => {
        const isOpen = expanded.has(code);
        const countryActive = selectedCountry === code && !selectedCity;

        return (
          <div key={code}>
            <div className="flex items-center">
              <button
                onClick={() => handleSelect(code, '')}
                className={`flex flex-1 items-center gap-2.5 px-4 py-2 text-left font-body text-sm transition-colors ${
                  countryActive
                    ? 'bg-[#d4af37]/[0.08] text-[#d4af37]'
                    : 'text-white/55 hover:text-white/85'
                }`}
              >
                {flag && <span className="text-base leading-none">{flag}</span>}
                <span className="flex-1 truncate">{country}</span>
              </button>
              <button
                onClick={() => toggle(code)}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-white/25 transition-colors hover:text-white/55 mr-1"
                aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>
            </div>

            {isOpen && (
              <ul className="pb-1">
                {cities.map((city) => {
                  const cityActive = selectedCountry === code && selectedCity === city;
                  return (
                    <li key={city}>
                      <button
                        onClick={() => handleSelect(code, city)}
                        className={`relative flex w-full items-center py-1.5 pl-10 pr-4 text-left font-body text-xs transition-colors ${
                          cityActive ? 'text-[#d4af37]' : 'text-white/32 hover:text-white/60'
                        }`}
                      >
                        {cityActive && (
                          <span className="absolute left-0 top-0 h-full w-[2px] rounded-r-full bg-[#d4af37]" aria-hidden />
                        )}
                        {city}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function LocationSidebar({
  selectedCountry,
  selectedCity,
  onSelect,
  mobileOpen,
  onMobileClose,
  geoData,
}: LocationSidebarProps) {
  return (
    <>
  {/* Desktop sidebar */}
  <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-white/[0.06] sticky top-[var(--site-header-height)] self-start h-[calc(100vh-var(--site-header-height))] overflow-y-auto overscroll-contain">
    <div className="px-4 pb-1 pt-4">
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/20">
        Локация
      </span>
    </div>

    <SidebarContent
      selectedCountry={selectedCountry}
      selectedCity={selectedCity}
      onSelect={onSelect}
      onMobileClose={() => {}}
      geoData={geoData}
    />
  </aside>

  {/* Mobile backdrop */}
  <div
    className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-[3px] md:hidden
      transition-opacity duration-300
      ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}
    `}
    onClick={onMobileClose}
    aria-hidden
  />

  {/* Mobile drawer */}
  <aside
    className={`fixed inset-y-0 left-0 z-[201] flex w-[260px] flex-col
      overflow-y-auto bg-[#0d0d0d] border-r border-white/[0.08] md:hidden
      transform transition-transform duration-300 ease-out
      ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
    `}
  >
    <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-4">
      <span className="font-display text-sm font-bold tracking-wide text-white">
        Локация
      </span>

      <button
        onClick={onMobileClose}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
        aria-label="Закрыть"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>

    <SidebarContent
      selectedCountry={selectedCountry}
      selectedCity={selectedCity}
      onSelect={onSelect}
      onMobileClose={onMobileClose}
      geoData={geoData}
    />
  </aside>
</>
  );
}
