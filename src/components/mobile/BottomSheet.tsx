import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { useModal } from '../../contexts/ModalContext';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
  footer?: React.ReactNode;
}

/**
 * BottomSheet - Slide-up modal for mobile details/actions
 * Features:
 * - Slides up from bottom
 * - Backdrop blur
 * - Drag handle with drag-to-close functionality
 * - Smooth animations
 * - Click outside to close
 * - Hides mobile navigation bars when open
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '90vh',
  footer,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useModal();
  const [dragY, setDragY] = useState(0);
  const dragYRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
      // Notify that modal is open
      openModal();
    } else {
      document.body.style.overflow = '';
      // Notify that modal is closed
      closeModal();
      // Reset drag state
      dragYRef.current = 0;
      setDragY(0);
      setIsDragging(false);
    }

    return () => {
      document.body.style.overflow = '';
      closeModal();
    };
  }, [isOpen, openModal, closeModal]);

  // Handle drag start
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't drag if clicking the close button
    const target = e.target as HTMLElement;
    if (target.closest('button') && target.closest('button')?.getAttribute('aria-label')?.includes('close')) {
      return;
    }
    
    // Allow dragging from drag handle or header area
    const isDragHandle = dragHandleRef.current?.contains(target);
    const isHeader = target.closest('[data-drag-area]');
    
    if (!isDragHandle && !isHeader) {
      return;
    }
    
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
  };

  // Handle drag move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentYRef.current = e.touches[0].clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    // Only allow dragging down
    if (deltaY > 0) {
      dragYRef.current = deltaY;
      setDragY(deltaY);
      e.preventDefault(); // Prevent scrolling
    }
  };

  // Handle drag end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100; // Close if dragged down more than 100px
    if (dragYRef.current > threshold) {
      onClose();
    } else {
      // Snap back
      dragYRef.current = 0;
      setDragY(0);
    }
    
    setIsDragging(false);
  };

  // Mouse drag handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking the close button
    const target = e.target as HTMLElement;
    if (target.closest('button') && target.closest('button')?.getAttribute('aria-label')?.includes('close')) {
      return;
    }
    
    // Allow dragging from drag handle or header area
    const isDragHandle = dragHandleRef.current?.contains(target);
    const isHeader = target.closest('[data-drag-area]');
    
    if (!isDragHandle && !isHeader) {
      return;
    }
    
    setIsDragging(true);
    startYRef.current = e.clientY;
    currentYRef.current = startYRef.current;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    currentYRef.current = e.clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    if (deltaY > 0) {
      dragYRef.current = deltaY;
      setDragY(deltaY);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (dragY > threshold) {
      onClose();
    } else {
      setDragY(0);
    }
    
    setIsDragging(false);
  };

  // Attach mouse event listeners for desktop testing
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMoveWrapper = (e: MouseEvent) => {
      currentYRef.current = e.clientY;
      const deltaY = currentYRef.current - startYRef.current;
      
      if (deltaY > 0) {
        dragYRef.current = deltaY;
        setDragY(deltaY);
      }
    };

    const handleMouseUpWrapper = () => {
      const threshold = 100;
      if (dragYRef.current > threshold) {
        onClose();
      } else {
        dragYRef.current = 0;
        setDragY(0);
      }
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMoveWrapper);
    document.addEventListener('mouseup', handleMouseUpWrapper);
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveWrapper);
      document.removeEventListener('mouseup', handleMouseUpWrapper);
    };
  }, [isDragging, onClose]);

  if (!isOpen) return null;

  const transform = dragY > 0 ? `translateY(${dragY}px)` : 'translateY(0)';
  const opacity = dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : 1;

  return (
    <>
      {/* Enhanced Backdrop - Darker and more visible */}
      <div
        className="fixed inset-0 bg-black backdrop-blur-md z-[55] transition-opacity"
        style={{ opacity }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-800 rounded-t-3xl shadow-2xl flex flex-col border-t-4 border-primary-500 transition-transform duration-200"
        style={{ 
          maxHeight: footer ? '95vh' : maxHeight,
          transform,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Drag Handle - Clickable area */}
        <div 
          ref={dragHandleRef}
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-16 h-1.5 bg-primary-500/50 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div 
            data-drag-area
            className="flex items-center justify-between px-4 pb-3 border-b border-gray-700 flex-shrink-0 cursor-grab active:cursor-grabbing"
          >
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1" aria-label="close">
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t-2 border-gray-700 bg-gray-800 flex-shrink-0 z-10 relative" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default BottomSheet;

