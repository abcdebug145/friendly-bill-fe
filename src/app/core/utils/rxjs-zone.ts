import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

/** Đưa mọi next/error/complete từ source vào trong NgZone (cần khi nguồn là Promise/API không patch như crypto.subtle). */
export function enterNgZone<T>(zone: NgZone): OperatorFunction<T, T> {
  return (source) =>
    new Observable<T>((subscriber) => {
      const sub = source.subscribe({
        next: (value) => zone.run(() => subscriber.next(value)),
        error: (err) => zone.run(() => subscriber.error(err)),
        complete: () => zone.run(() => subscriber.complete())
      });
      return () => sub.unsubscribe();
    });
}
