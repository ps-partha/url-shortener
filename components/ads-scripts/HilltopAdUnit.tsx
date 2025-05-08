'use client';

import { useEffect, useRef } from 'react';

const HilltopAdUnit = ({ adUrl ,key }: { adUrl: string ,key:number}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adRef.current) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = adUrl; // Dynamic ad URL
    script.async = true;
    script.referrerPolicy = 'no-referrer-when-downgrade';

    adRef.current.innerHTML = ''; // clear old if any
    adRef.current.appendChild(script);
  }, [adUrl]);

  return (
    <div ref={adRef} key={key} className='overflow-hidden flex justify-center'/>
  );
};

export default HilltopAdUnit;
