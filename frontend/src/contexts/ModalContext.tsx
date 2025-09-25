'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalConfig {
  component: string;
  props?: any;
  options?: ModalOptions;
}

interface ModalOptions {
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom';
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  backdrop?: boolean;
  backdropBlur?: boolean;
  persistent?: boolean;
  priority?: number;
}

interface ModalInstance extends ModalConfig {
  id: string;
}

interface ModalContextType {
  openModal: (config: ModalConfig) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModal: (id: string, props: any) => void;
  isModalOpen: (id: string) => boolean;
  modals: ModalInstance[];
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Modal components registry - lazy loaded for performance
const modalComponents: Record<string, React.ComponentType<any>> = {
  // TODO: Uncomment when modal components are implemented
  // UserForm: dynamic(() => import('@/components/modals/UserForm')),
  // ConfirmDialog: dynamic(() => import('@/components/modals/ConfirmDialog')),
  // WorkflowEditor: dynamic(() => import('@/components/modals/WorkflowEditor')),
  // Add more modal components as needed
};

// Register a new modal component dynamically
export const registerModalComponent = (name: string, component: React.ComponentType<any>) => {
  modalComponents[name] = component;
};

interface ModalProviderProps {
  children: React.ReactNode;
  maxModals?: number;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({
  children,
  maxModals = 5
}) => {
  const [modals, setModals] = useState<ModalInstance[]>([]);
  const modalRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Generate unique modal ID
  const generateModalId = useCallback(() => {
    return `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Open modal
  const openModal = useCallback((config: ModalConfig) => {
    const id = generateModalId();

    setModals(prev => {
      // Limit number of modals
      const newModals = [...prev];
      if (newModals.length >= maxModals) {
        newModals.shift(); // Remove oldest modal
      }

      // Add new modal with priority sorting
      const newModal: ModalInstance = { ...config, id };
      newModals.push(newModal);

      // Sort by priority if specified
      if (config.options?.priority !== undefined) {
        newModals.sort((a, b) => {
          const aPriority = a.options?.priority ?? 0;
          const bPriority = b.options?.priority ?? 0;
          return bPriority - aPriority;
        });
      }

      return newModals;
    });

    return id;
  }, [generateModalId, maxModals]);

  // Close modal
  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
    modalRefs.current.delete(id);
  }, []);

  // Close all modals
  const closeAllModals = useCallback(() => {
    setModals([]);
    modalRefs.current.clear();
  }, []);

  // Update modal props
  const updateModal = useCallback((id: string, props: any) => {
    setModals(prev => prev.map(modal =>
      modal.id === id
        ? { ...modal, props: { ...modal.props, ...props } }
        : modal
    ));
  }, []);

  // Check if modal is open
  const isModalOpen = useCallback((id: string) => {
    return modals.some(modal => modal.id === id);
  }, [modals]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topModal = modals[modals.length - 1];
        if (topModal && topModal.options?.closeOnEscape !== false) {
          closeModal(topModal.id);
        }
      }
    };

    if (modals.length > 0) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [modals, closeModal]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [modals.length]);

  const contextValue: ModalContextType = {
    openModal,
    closeModal,
    closeAllModals,
    updateModal,
    isModalOpen,
    modals,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <AnimatePresence mode="wait">
        {modals.map((modal) => {
          const Component = modalComponents[modal.component];
          if (!Component) {
            console.error(`Modal component "${modal.component}" not found in registry`);
            return null;
          }

          const {
            closeOnOverlayClick = true,
            className = '',
            size = 'md',
            position = 'center',
            animation = 'fade',
            backdrop = true,
            backdropBlur = true,
            persistent = false,
          } = modal.options || {};

          // Size classes
          const sizeClasses = {
            sm: 'max-w-sm',
            md: 'max-w-md',
            lg: 'max-w-lg',
            xl: 'max-w-xl',
            full: 'max-w-full',
          };

          // Position classes
          const positionClasses = {
            center: 'items-center justify-center',
            top: 'items-start justify-center pt-16',
            bottom: 'items-end justify-center pb-16',
          };

          // Animation variants
          const animationVariants = {
            fade: {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            },
            slide: {
              initial: { opacity: 0, y: 50 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: 50 },
            },
            scale: {
              initial: { opacity: 0, scale: 0.9 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.9 },
            },
            none: {
              initial: {},
              animate: {},
              exit: {},
            },
          };

          const variants = animationVariants[animation];

          return (
            <motion.div
              key={modal.id}
              className={`fixed inset-0 z-50 flex ${positionClasses[position]} ${className}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={variants}
              transition={{ duration: 0.2 }}
            >
              {backdrop && (
                <motion.div
                  className={`absolute inset-0 bg-black/50 ${
                    backdropBlur ? 'backdrop-blur-sm' : ''
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    if (closeOnOverlayClick && !persistent) {
                      closeModal(modal.id);
                    }
                  }}
                />
              )}

              <div
                ref={(ref) => {
                  if (ref) modalRefs.current.set(modal.id, ref);
                }}
                className={`relative w-full ${sizeClasses[size]} mx-4`}
              >
                <Component
                  {...modal.props}
                  modalId={modal.id}
                  onClose={() => {
                    if (!persistent) {
                      closeModal(modal.id);
                    }
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

// Hook to use modal context
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// Utility hooks for common modal operations
export const useConfirmModal = () => {
  const { openModal, closeModal } = useModal();

  const confirm = useCallback((options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }) => {
    const modalId = openModal({
      component: 'ConfirmDialog',
      props: {
        ...options,
        onConfirm: () => {
          options.onConfirm();
          closeModal(modalId);
        },
        onCancel: () => {
          options.onCancel?.();
          closeModal(modalId);
        },
      },
      options: {
        closeOnOverlayClick: false,
        closeOnEscape: false,
        size: 'sm',
      },
    });

    return modalId;
  }, [openModal, closeModal]);

  return { confirm };
};

// Utility hook for alert modal
export const useAlertModal = () => {
  const { openModal, closeModal } = useModal();

  const alert = useCallback((options: {
    title: string;
    message: string;
    buttonText?: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  }) => {
    const modalId = openModal({
      component: 'AlertDialog',
      props: {
        ...options,
        onClose: () => closeModal(modalId),
      },
      options: {
        closeOnOverlayClick: true,
        closeOnEscape: true,
        size: 'sm',
      },
    });

    return modalId;
  }, [openModal, closeModal]);

  return { alert };
};

// Import framer-motion types if not already imported
import { useEffect } from 'react';