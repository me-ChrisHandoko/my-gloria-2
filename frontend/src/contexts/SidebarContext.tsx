'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type SidebarPosition = 'left' | 'right';
type SidebarSize = 'sm' | 'md' | 'lg' | 'xl';
type SidebarBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface SidebarContextType {
  // Core state
  isOpen: boolean;
  isCollapsed: boolean;
  isPinned: boolean;
  isMobile: boolean;
  isHovered: boolean;

  // Configuration
  position: SidebarPosition;
  size: SidebarSize;
  breakpoint: SidebarBreakpoint;

  // Actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  togglePin: () => void;
  setPin: (pinned: boolean) => void;
  setHovered: (hovered: boolean) => void;

  // Settings
  setPosition: (position: SidebarPosition) => void;
  setSize: (size: SidebarSize) => void;
  setBreakpoint: (breakpoint: SidebarBreakpoint) => void;

  // Utility
  lockScroll: boolean;
  overlay: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
  defaultPinned?: boolean;
  defaultPosition?: SidebarPosition;
  defaultSize?: SidebarSize;
  defaultBreakpoint?: SidebarBreakpoint;
  storageKey?: string;
  lockScrollOnMobile?: boolean;
  showOverlay?: boolean;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  defaultOpen = true,
  defaultCollapsed = false,
  defaultPinned = true,
  defaultPosition = 'left',
  defaultSize = 'md',
  defaultBreakpoint = 'lg',
  storageKey = 'gloria-sidebar',
  lockScrollOnMobile = true,
  showOverlay = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isPinned, setIsPinned] = useState(defaultPinned);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<SidebarPosition>(defaultPosition);
  const [size, setSize] = useState<SidebarSize>(defaultSize);
  const [breakpoint, setBreakpoint] = useState<SidebarBreakpoint>(defaultBreakpoint);

  // Breakpoint pixels
  const breakpointPixels = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };

  // Load saved preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.isOpen !== undefined) setIsOpen(parsed.isOpen);
        if (parsed.isCollapsed !== undefined) setIsCollapsed(parsed.isCollapsed);
        if (parsed.isPinned !== undefined) setIsPinned(parsed.isPinned);
        if (parsed.position) setPosition(parsed.position);
        if (parsed.size) setSize(parsed.size);
      } catch (error) {
        console.error('Failed to load sidebar state:', error);
      }
    }
  }, [storageKey]);

  // Save preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const state = {
      isOpen,
      isCollapsed,
      isPinned,
      position,
      size,
    };

    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [isOpen, isCollapsed, isPinned, position, size, storageKey]);

  // Handle responsive behavior
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBreakpoint = () => {
      const width = window.innerWidth;
      const isMobileView = width < breakpointPixels[breakpoint];

      setIsMobile(isMobileView);

      // Auto-close on mobile, auto-open on desktop
      if (isMobileView && isPinned) {
        setIsOpen(false);
        setIsPinned(false);
      } else if (!isMobileView && !isPinned && defaultPinned) {
        setIsOpen(true);
        setIsPinned(true);
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);

    return () => {
      window.removeEventListener('resize', checkBreakpoint);
    };
  }, [breakpoint, isPinned, defaultPinned]);

  // Lock body scroll on mobile when sidebar is open
  useEffect(() => {
    if (!lockScrollOnMobile || !isMobile || !isOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile, lockScrollOnMobile]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Open sidebar
  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle collapse
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Set collapsed
  const setCollapsedState = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
  }, []);

  // Toggle pin
  const togglePin = useCallback(() => {
    setIsPinned(prev => !prev);
  }, []);

  // Set pin
  const setPin = useCallback((pinned: boolean) => {
    setIsPinned(pinned);
  }, []);

  // Set hovered
  const setHoveredState = useCallback((hovered: boolean) => {
    setIsHovered(hovered);
  }, []);

  // Set position
  const setPositionState = useCallback((newPosition: SidebarPosition) => {
    setPosition(newPosition);
  }, []);

  // Set size
  const setSizeState = useCallback((newSize: SidebarSize) => {
    setSize(newSize);
  }, []);

  // Set breakpoint
  const setBreakpointState = useCallback((newBreakpoint: SidebarBreakpoint) => {
    setBreakpoint(newBreakpoint);
  }, []);

  const contextValue: SidebarContextType = {
    // Core state
    isOpen,
    isCollapsed,
    isPinned,
    isMobile,
    isHovered,

    // Configuration
    position,
    size,
    breakpoint,

    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    toggleCollapse,
    setCollapsed: setCollapsedState,
    togglePin,
    setPin,
    setHovered: setHoveredState,

    // Settings
    setPosition: setPositionState,
    setSize: setSizeState,
    setBreakpoint: setBreakpointState,

    // Utility
    lockScroll: lockScrollOnMobile && isMobile && isOpen,
    overlay: showOverlay && isMobile && isOpen,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

// Hook to use sidebar context
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Utility hook for sidebar CSS classes
export const useSidebarClasses = () => {
  const {
    isOpen,
    isCollapsed,
    isPinned,
    isMobile,
    position,
    size,
  } = useSidebar();

  const sizeClasses = {
    sm: isCollapsed ? 'w-16' : 'w-56',
    md: isCollapsed ? 'w-16' : 'w-64',
    lg: isCollapsed ? 'w-16' : 'w-72',
    xl: isCollapsed ? 'w-16' : 'w-80',
  };

  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  const translateClasses = {
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
  };

  return {
    sidebar: `
      fixed top-0 ${positionClasses[position]} h-full z-40
      ${sizeClasses[size]}
      ${translateClasses[position]}
      transition-all duration-300 ease-in-out
      ${isMobile ? 'shadow-2xl' : ''}
    `.trim(),

    content: `
      transition-all duration-300 ease-in-out
      ${!isMobile && isOpen && position === 'left' ? `ml-${isCollapsed ? '16' : size === 'sm' ? '56' : size === 'md' ? '64' : size === 'lg' ? '72' : '80'}` : ''}
      ${!isMobile && isOpen && position === 'right' ? `mr-${isCollapsed ? '16' : size === 'sm' ? '56' : size === 'md' ? '64' : size === 'lg' ? '72' : '80'}` : ''}
    `.trim(),

    overlay: `
      fixed inset-0 bg-black/50 z-30
      ${isMobile && isOpen ? 'block' : 'hidden'}
      transition-opacity duration-300
    `.trim(),
  };
};

// Utility hook for keyboard shortcuts
export const useSidebarKeyboard = (
  shortcuts: {
    toggle?: string;
    collapse?: string;
    pin?: string;
  } = {
    toggle: 'ctrl+b',
    collapse: 'ctrl+/',
    pin: 'ctrl+p',
  }
) => {
  const { toggleSidebar, toggleCollapse, togglePin } = useSidebar();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (shortcuts.toggle && ctrl && key === shortcuts.toggle.split('+')[1]) {
        e.preventDefault();
        toggleSidebar();
      }

      if (shortcuts.collapse && ctrl && key === shortcuts.collapse.split('+')[1]) {
        e.preventDefault();
        toggleCollapse();
      }

      if (shortcuts.pin && ctrl && key === shortcuts.pin.split('+')[1]) {
        e.preventDefault();
        togglePin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, toggleSidebar, toggleCollapse, togglePin]);
};

// Utility hook for swipe gestures on mobile
export const useSidebarSwipe = (threshold = 50) => {
  const { openSidebar, closeSidebar, position, isMobile } = useSidebar();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > threshold;
      const isRightSwipe = distance < -threshold;

      if (position === 'left') {
        if (isLeftSwipe) closeSidebar();
        if (isRightSwipe) openSidebar();
      } else {
        if (isRightSwipe) closeSidebar();
        if (isLeftSwipe) openSidebar();
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, threshold, position, isMobile, openSidebar, closeSidebar]);
};