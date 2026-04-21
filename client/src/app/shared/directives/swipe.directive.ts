import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';

/** Minimum horizontal distance in px to register as a swipe. */
const MIN_DISTANCE = 60;
/** Horizontal displacement must exceed this multiple of vertical displacement. */
const DIRECTION_LOCK = 1.8;

/**
 * Detects horizontal swipe gestures on the host element.
 * Uses passive touch listeners so native scroll is never blocked.
 *
 * Usage:
 *   <div appSwipe (swipeLeft)="onLeft()" (swipeRight)="onRight()">
 */
@Directive({
  selector: '[appSwipe]',
  standalone: true,
})
export class SwipeDirective implements OnInit, OnDestroy {
  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();

  private el = inject(ElementRef<HTMLElement>);
  private startX = 0;
  private startY = 0;

  private readonly onTouchStart = (e: TouchEvent) => {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
  };

  private readonly onTouchEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - this.startX;
    const dy = e.changedTouches[0].clientY - this.startY;
    if (Math.abs(dx) < MIN_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_LOCK) return;
    if (dx < 0) this.swipeLeft.emit();
    else this.swipeRight.emit();
  };

  ngOnInit(): void {
    const el = this.el.nativeElement;
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  ngOnDestroy(): void {
    const el = this.el.nativeElement;
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchend', this.onTouchEnd);
  }
}
