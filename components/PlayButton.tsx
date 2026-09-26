'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function PlayButton({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLoggedIn(Boolean(data?.loggedIn));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = () => {
    if (loggedIn) {
      router.push('/dashboard');
    } else if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('lp-open-join'));
    } else {
      router.push('/?join=1');
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className} style={style}>
      {children}
    </button>
  );
}
