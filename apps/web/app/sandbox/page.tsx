'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

type CategoryKey = 'textual' | 'buttons' | 'media' | 'icons' | 'structure' | 'interactive';

interface CategoryData {
  title: string;
  icon: keyof typeof LucideIcons;
  items: { icon: keyof typeof LucideIcons; name: string }[];
}

const categoriesData: Record<CategoryKey, CategoryData> = {
  textual: {
    title: 'Текстовые элементы',
    icon: 'Text',
    items: [
      { icon: 'Heading', name: 'Heading' },
      { icon: 'Text', name: 'Text Editor' },
      { icon: 'PencilLine', name: 'Text Path' },
      { icon: 'Columns', name: 'Dual Heading' },
    ],
  },
  buttons: {
    title: 'Кнопки и CTA',
    icon: 'MousePointerClick',
    items: [
      { icon: 'MousePointerClick', name: 'Button' },
      { icon: 'ArrowRight', name: 'Advanced Button' },
      { icon: 'Megaphone', name: 'Call to Action' },
      { icon: 'ArrowLeftRight', name: 'Dual Button' },
    ],
  },
  media: {
    title: 'Медиа и изображения',
    icon: 'Image',
    items: [
      { icon: 'Image', name: 'Image' },
      { icon: 'Images', name: 'Image Carousel' },
      { icon: 'LayoutGrid', name: 'Image Gallery' },
      { icon: 'ArrowLeftRight', name: 'Before / After' },
      { icon: 'Film', name: 'Lottie Animation' },
      { icon: 'Video', name: 'Video' },
    ],
  },
  icons: {
    title: 'Иконки и боксы',
    icon: 'Star',
    items: [
      { icon: 'Star', name: 'Icon' },
      { icon: 'Package', name: 'Icon Box' },
      { icon: 'Image', name: 'Image Box' },
      { icon: 'List', name: 'Icon List' },
    ],
  },
  structure: {
    title: 'Структура и Layout',
    icon: 'LayoutDashboard',
    items: [
      { icon: 'Square', name: 'Container' },
      { icon: 'RectangleHorizontal', name: 'Section' },
      { icon: 'Minus', name: 'Divider' },
      { icon: 'ArrowUpDown', name: 'Spacer' },
    ],
  },
  interactive: {
    title: 'Интерактивные элементы',
    icon: 'RotateCw',
    items: [
      { icon: 'ListCollapse', name: 'Accordion' },
      { icon: 'TableProperties', name: 'Tabs' },
      { icon: 'BarChart', name: 'Progress Bar' },
      { icon: 'Hash', name: 'Counter' },
      { icon: 'MessageSquareText', name: 'Testimonial' },
    ],
  },
};

const toolTiles: { key: CategoryKey; icon: keyof typeof LucideIcons; name: string }[] = [
  { key: 'textual', icon: 'Text', name: 'Текст' },
  { key: 'buttons', icon: 'MousePointerClick', name: 'Кнопки' },
  { key: 'media', icon: 'Image', name: 'Медиа' },
  { key: 'icons', icon: 'Star', name: 'Иконки' },
  { key: 'structure', icon: 'LayoutDashboard', name: 'Структура' },
  { key: 'interactive', icon: 'RotateCw', name: 'Интерактив' },
];

export default function SandboxPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [flyoutPos, setFlyoutPos] = useState(0);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const mainToolsRef = useRef<HTMLDivElement>(null);

  const showFlyout = useCallback((categoryKey: CategoryKey, tileElement: HTMLElement) => {
    setActiveCategory(categoryKey);
    const rect = tileElement.getBoundingClientRect();
    const panel = document.querySelector('.left-panel') as HTMLElement;
    const panelRect = panel?.getBoundingClientRect();
    if (panelRect) {
      setFlyoutPos(rect.top - panelRect.top + 8);
    }
  }, []);

  const closeFlyout = useCallback(() => {
    setActiveCategory(null);
    if (mainToolsRef.current) {
      const activeTile = mainToolsRef.current.querySelector('.tool-tile.active');
      activeTile?.classList.remove('active');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !e.target ||
        (!(e.target as HTMLElement).closest('.left-panel') &&
          !(e.target as HTMLElement).closest('.flyout-panel'))
      ) {
        closeFlyout();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFlyout();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [closeFlyout]);

  const activeData = activeCategory ? categoriesData[activeCategory] : null;
  const HeaderIcon = activeData ? LucideIcons[activeData.icon] : null;

  const renderIcon = (IconComponent: any, size: number) => {
    if (!IconComponent) return null;
    const Icon = IconComponent as React.ComponentType<{ size?: number }>;
    return <Icon size={size} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#1e1e1e] text-[#eee] font-['Inter',system-ui,sans-serif]">
      {/* Левая панель инструментов */}
      <div
        ref={mainToolsRef}
        className="left-panel w-[72px] bg-[#2d2d2d] border-r border-[#444] flex flex-col pt-3 shadow-[3px_0_15px_rgba(0,0,0,0.4)] z-100 relative"
      >
        <div className="panel-header text-center px-2 py-[10px] text-[11px] text-[#00ffcc] font-semibold border-b border-[#444] mb-2 tracking-[0.5px]">
          WIDGETS
        </div>

        <div className="main-tools flex flex-col gap-2 px-2">
          {toolTiles.map((tile) => {
            const IconComponent = LucideIcons[tile.icon];
            const isActive = activeCategory === tile.key;
            return (
              <div
                key={tile.key}
                className={`tool-tile w-14 h-14 bg-[#383838] rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 border-2 ${
                  isActive ? 'bg-[#00ffcc] text-[#1e1e1e] border-[#00ffcc]' : 'border-transparent hover:bg-[#4a4a4a] hover:scale-105'
                }`}
                title={tile.name}
                onClick={(e) => showFlyout(tile.key, e.currentTarget)}
              >
                <div className="tool-icon flex items-center justify-center text-2xl">
                  {renderIcon(IconComponent, 24)}
                </div>
                <div className="tool-name text-[9px] font-medium opacity-90 leading-[1.1]">
                  {tile.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flyout панель */}
      {activeData && (
        <div
          ref={flyoutRef}
          className="flyout-panel absolute left-[78px] bg-[#252525] border border-[#555] rounded-lg shadow-[8px_8px_25px_rgba(0,0,0,0.5)] p-3.5 flex flex-col gap-2.5 z-200 max-h-[85vh] overflow-y-auto"
          style={{ top: flyoutPos }}
        >
          <div className="flyout-header text-[14px] font-semibold text-[#00ffcc] pb-2 border-b border-[#444] mb-2 flex items-center gap-2">
            {HeaderIcon && renderIcon(HeaderIcon, 16)}
            <span>{activeData.title}</span>
          </div>
          <div className="flyout-grid grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-3">
            {activeData.items.map((item, idx) => {
              const ItemIcon = LucideIcons[item.icon];
              return (
                <div
                  key={idx}
                  className="flyout-item w-full aspect-square bg-[#383838] rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 border-2 border-transparent p-1 hover:bg-[#00ffcc] hover:text-[#1e1e1e] hover:scale-110"
                  onClick={() => alert(`Выбран виджет: ${item.name}\n\nВ реальном Elementor здесь началось бы перетаскивание на холст.`)}
                >
                  <div className="flyout-icon flex items-center justify-center text-2xl">
                    {renderIcon(ItemIcon, 26)}
                  </div>
                  <div className="flyout-name text-[10px] text-center leading-[1.2] font-medium">
                    {item.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Основная область холста */}
      <div className="main-canvas flex-1 bg-[linear-gradient(45deg,#1a1a1a_25%,#252525_25%,#252525_50%,#1a1a1a_50%,#1a1a1a_75%,#252525_75%,#252525_100%)_0_0_/_40px_40px] flex items-center justify-center relative">
        <div className="canvas-placeholder bg-[rgba(255,255,255,0.06)] border-3 border-dashed border-[#666] w-[75%] max-w-[900px] h-[82%] rounded-2xl flex items-center justify-center flex-col text-[#999] text-center">
          <h2 className="text-[#ccc] mb-2.5">Рабочая область</h2>
          <p>Нажми на категорию слева →<br />выбери конкретный виджет из flyout</p>
        </div>

        {/* Статус бар */}
        <div className="status-bar absolute bottom-0 left-[72px] right-0 h-[26px] bg-[#1e1e1e] border-t border-[#444] text-[12px] text-[#777] flex items-center px-5 justify-between">
          <div>Escort Platform • Lucide Icons Edition</div>
          <div>1920 × 1080 • 100%</div>
        </div>
      </div>
    </div>
  );
}
