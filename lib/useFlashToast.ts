'use client';

import { useEffect } from 'react';
import { notify } from './notify';

/** Turns a page's `error` / `success` state strings into toasts whenever they change. */
export function useFlashToast(error?: string | null, success?: string | null) {
  useEffect(() => { if (error) notify(error, 'error'); }, [error]);
  useEffect(() => { if (success) notify(success, 'success'); }, [success]);
}
