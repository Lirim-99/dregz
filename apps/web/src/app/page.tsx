'use client';

import { GuestUpload } from '@/components/GuestUpload';

const EVENT_CODE = process.env.NEXT_PUBLIC_EVENT_CODE || 'wedding';

export default function HomePage() {
  return <GuestUpload code={EVENT_CODE} />;
}
